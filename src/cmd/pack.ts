import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { joinKey } from '@meop/shire/reg'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
import { sameName, wordStartsWith } from '../match.ts'
import { lockRun, redirectCommonShell } from '../sh.ts'
import { type FilePlan, loadFileFns, ownFilePlan } from './file.ts'
import { resolveToolScript, type ToolScript, toolsWithScript } from './script.ts'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.description = 'package manager ops'
    this.aliases = ['p', 'pa', 'pac', 'package']
    this.commands = [
      new PackCmdAdd([...this.scopes, this.name]),
      new PackCmdFind([...this.scopes, this.name]),
      new PackCmdInfo([...this.scopes, this.name]),
      new PackCmdList([...this.scopes, this.name]),
      new PackCmdOutdated([...this.scopes, this.name]),
      new PackCmdPull([...this.scopes, this.name]),
      new PackCmdRemove([...this.scopes, this.name]),
      new PackCmdRenew([...this.scopes, this.name]),
      new PackCmdSync([...this.scopes, this.name]),
      new PackCmdTidy([...this.scopes, this.name]),
    ]
  }
}

// every manager wut knows, in the order to prefer them. which of these a machine actually has is a question only
// the client can answer, so there is no platform or distro map here to go stale
// after ghpm, a project's own release binary, the user managers run from the furthest from the system to the closest:
// the js runtimes, then python, then the compiled ones, with cargo last since a rust tool is the nearest kin of what a
// system installer ships. a dotnet would sit between python and go
const PORTABLE_MANAGERS: Array<string> = [
  'ghpm',
  // ahead of deno and bun: it holds node for the packages it installs, and can hold bun and deno as well, where a
  // package bun installs runs on whatever node PATH finds
  'pnpm',
  'deno',
  'bun',
  'uv',
  // its tools find their runtime through DOTNET_ROOT rather than PATH: see dotnet.nu
  'dotnet',
  'go',
  // binstall fetching a tool prebuilt is only a shortcut: what it installs is still native code
  'cargo',
]

const NATIVE_MANAGERS: Array<string> = [
  'brew',
  'paru',
  'yay',
  'pacman',
  'apk',
  'apt',
  'dnf',
  'emerge',
  'xbps',
  'zypper',
  // after the distro's own, which it would otherwise take every name from where nix is installed beside them
  'nix',
  'winget',
  'choco',
  'scoop',
]

const MANAGERS: Array<string> = [...PORTABLE_MANAGERS, ...NATIVE_MANAGERS]

const PACK_KEY = 'pack'
const PACK_MANAGERS_KEY = [PACK_KEY, 'managers']
const PACK_MANAGER_KEY = [PACK_KEY, 'manager']
const PACK_OP_KEY = [PACK_KEY, 'op']
const PACK_OP_NAMES_KEY = (op: string) => [PACK_KEY, op, 'names']
// the units the client picks from, as data; their bodies live in packRunUnit
const PACK_PLAN_KEY = [PACK_KEY, 'plan']
const PACK_FIND_KEY = [PACK_KEY, 'find']
// what each manager calls the groups that were typed, for the one op that asks all of them
const PACK_INFO_MAP_KEY = [PACK_KEY, 'info', 'map']
// the groups' own scripts a bare sync or tidy offers, for the client to gate
const PACK_SCRIPTS_KEY = [PACK_KEY, 'scripts']
// the groups' own files a bare sync offers, for the client to gate on the tool being here
const PACK_FILES_KEY = [PACK_KEY, 'files']

// the ops that carry a group's own files: written after an add's install, written again on a sync, taken out on a
// remove
const OWN_FILE_OPS = ['add', 'remove', 'sync']

const SCRIPT_PATH = 'script'

// a group's own scripts are the ones under cfg/script named for the group itself, the last level of its path, and
// each op runs its own of them: add runs the tool's repo before the installs and its setup after them, remove its
// teardown before. an alias is only another name to type, so it reaches no script
const OWN_HOOKS: Record<string, { pre?: string; post?: string }> = {
  add: { pre: 'repo', post: 'setup' },
  remove: { pre: 'teardown' },
}

// a group's own add, remove or sync script is one more path for that op, the way a manager is: the tool's own
// installer, its uninstaller, and what keeps it current — updating a standalone install, or putting back what an
// update undid
const OWN_PATHS = ['add', 'remove', 'sync']

function groupTool(name: string): string {
  return name.split('/').at(-1) ?? ''
}

// the order a group's managers are tried in, whatever order its yaml lists them: the user managers, then what a group
// runs instead of a package — a project's own installer, its official way in — then the system's. the first present
// wins, so a group's script runs only where none of the user managers it names is here
const GROUP_ORDER: Array<string> = [...PORTABLE_MANAGERS, SCRIPT_PATH, ...NATIVE_MANAGERS]

export function groupOrdered(managers: Array<string>): Array<string> {
  const rank = (m: string) => {
    const i = GROUP_ORDER.indexOf(m)
    return i < 0 ? GROUP_ORDER.length : i
  }
  return [...managers].sort((a, b) => rank(a) - rank(b))
}

export function getSupportedManagers(): Array<string> {
  return [...MANAGERS]
}

export function evaluateGate(
  gate: Record<string, Array<string>> | null | undefined,
  context: Ctx,
): boolean {
  if (!gate) {
    return true
  }
  for (const [key, values] of Object.entries(gate)) {
    const ctxVal = context[key as keyof Ctx] as string | undefined
    if (!ctxVal) {
      return false
    }
    const matches = key === 'sys_os_like' ? values.some((v) => ctxVal.includes(v)) : values.includes(ctxVal)
    if (!matches) {
      return false
    }
  }
  return true
}

const managerAliasMap: Record<string, string> = {
  paru: 'pacman',
  yay: 'pacman',
}

function getManagerFuncName(manager: string, prefix = PACK_KEY) {
  return manager
    ? `${prefix}${manager[0].toUpperCase()}${manager.slice(1).replaceAll('-', '').replaceAll('_', '').toLowerCase()}`
    : ''
}

function getManagerCallName(manager: string): string {
  return getManagerFuncName(managerAliasMap[manager] ?? manager)
}

// the ops a manager states it can do, read from the arms of its own `match $env.PACK_OP`. derived rather than
// listed, so a manager gaining or losing an op is one edit in one file
const ARM_OPS = ['add', 'info', 'list', 'outdated', 'remove', 'renew', 'sync', 'tidy']

// the managers with something to pull: an index, repo sources, or goup's own tools for a go that is goup's. the rest
// fetch what they need when asked, so pulling them is nothing
const PULL_MANAGERS = [
  'ghpm',
  'go',
  'brew',
  'paru',
  'yay',
  'pacman',
  'apk',
  'apt',
  'dnf',
  'emerge',
  'xbps',
  'zypper',
  'winget',
  'scoop',
]

function managerFileOps(content: string): Array<string> {
  return ARM_OPS.filter((op) => new RegExp(`^ {4}${op} => \\{$`, 'm').test(content))
}

async function loadManagerFiles(
  shell: Sh,
  managers: Array<string>,
) {
  let _shell = shell
    .with(await shell.fileLoad(['sel'], import.meta.resolve, ['..']))
    .with(await shell.fileLoad(['lock'], import.meta.resolve, ['..']))
    .with(await shell.fileLoad(['match'], import.meta.resolve, ['..']))
    // a group's own scripts are gated the way `script exec` gates them, and its own files written the way `file sync`
    // writes them
    .with(await shell.fileLoad(['script'], import.meta.resolve, ['..']))
    .with(await loadFileFns(shell))
    .with(await shell.fileLoad([PACK_KEY], import.meta.resolve, ['..']))
  const loadedOps = new Map<string, Array<string>>()
  for (const manager of managers) {
    const fileKey = managerAliasMap[manager] ?? manager
    if (!loadedOps.has(fileKey)) {
      const content = await _shell.fileLoad(
        [PACK_KEY, fileKey],
        import.meta.resolve,
        ['..'],
      )
      _shell = _shell.with(content)
      loadedOps.set(fileKey, managerFileOps(content))
    }
  }
  const opsByManager = new Map(
    managers.map((m) => [m, loadedOps.get(managerAliasMap[m] ?? m) ?? []]),
  )
  return { shell: _shell, opsByManager }
}

function buildAndLog(shell: Sh, environment: Env) {
  const body = shell.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

async function initOp(
  shell: Sh,
  op: string,
): Promise<
  {
    shell: Sh
    allManagers: Array<string>
  }
> {
  const supported = getSupportedManagers()
  const { shell: _shell, opsByManager } = await loadManagerFiles(
    shell.with(shell.varSetStr(PACK_OP_KEY, op)),
    supported,
  )
  // a manager with no arm for this op would be a row in the table that ran nothing when picked. `find` is not an
  // arm at all — it is the client walking managers rather than one of them acting — so it keeps every manager
  const allManagers = ARM_OPS.includes(op)
    ? supported.filter((m) => opsByManager.get(m)?.includes(op))
    : op === 'pull'
    ? supported.filter((m) => PULL_MANAGERS.includes(m))
    : supported
  return { shell: _shell, allManagers }
}

// a drop-in is a group's file with levels after a dot, `<group>.<plat>[.<os>[.<arch>]]`: it is merged into the group
// wherever its levels match this machine, so it is never a group of its own
export function isDropIn(parts: Array<string>): boolean {
  return parts.at(-1)?.includes('.') ?? false
}

async function getGroupParts(): Promise<Array<Array<string>>> {
  return (await getCfgDirDump([PACK_KEY], { extension: Fmt.yaml })).filter((parts) => !isDropIn(parts))
}

// a drop-in adds to its group: lists combine, maps merge key by key, and a single value both set differently is an
// error, since neither is more right than the other
export function mergeDropIn(base: unknown, dropIn: unknown, where: string): unknown {
  if (Array.isArray(base) && Array.isArray(dropIn)) {
    return [...new Set([...base, ...dropIn])]
  }
  const isMap = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object' && !Array.isArray(v)
  if (isMap(base) && isMap(dropIn)) {
    const merged: Record<string, unknown> = { ...base }
    for (const [key, value] of Object.entries(dropIn)) {
      merged[key] = key in base ? mergeDropIn(base[key], value, `${where}.${key}`) : value
    }
    return merged
  }
  if (base === dropIn) {
    return base
  }
  throw new Error(`drop-in sets ${where}, which its group already sets otherwise`)
}

// with a machine to load for, each drop-in whose levels it matches is merged in, broadest first
async function loadGroupConfig(parts: Array<string>, context?: Ctx) {
  // every group comes from the listing, so an empty file is a group with nothing to state but its name: one its own
  // scripts install
  const content = (await getCfgFileLoad([PACK_KEY, ...parts], { extension: Fmt.yaml })) ?? {}
  if (!context) {
    return content
  }
  let merged: unknown = content
  let name = parts.at(-1) ?? ''
  for (const level of [context.sys_os_plat, context.sys_os, context.sys_cpu_arch]) {
    if (!level) {
      break
    }
    name = `${name}.${level}`
    const dropInParts = [...parts.slice(0, -1), name]
    const dropIn = await getCfgFileLoad([PACK_KEY, ...dropInParts], { extension: Fmt.yaml })
    if (dropIn != null) {
      merged = mergeDropIn(merged, dropIn, groupName(dropInParts))
    }
  }
  return merged
}

// operations live under 'operation', beside the group's own metadata
// deno-lint-ignore no-explicit-any
function groupOp(content: any, op: 'add' | 'remove' | 'sync'): any {
  return content?.operation?.[op]
}

// another name for the whole group, for lookup only — managers still install the names they declare
function groupAliases(content: unknown): Array<string> {
  const aliases = (content as { aliases?: unknown } | null)?.aliases
  return Array.isArray(aliases) ? aliases.filter((a): a is string => typeof a === 'string') : []
}

// every manager's declared package identifier for this group, e.g. 'windirstat' or 'WinDirStat.WinDirStat'
// deno-lint-ignore no-explicit-any
function groupPackageNames(content: any): Array<string> {
  const managerConfig = (groupOp(content, 'add')?.manager ?? {}) as Record<string, ManagerEntry>
  const names: Array<string> = []
  for (const tier of Object.keys(managerConfig)) {
    if (tier === SCRIPT_PATH) {
      continue
    }
    names.push(...(managerConfig[tier]?.names ?? []))
  }
  return names
}

// what find reads besides names: a sentence about the group, for when the name is the thing forgotten
function groupDescr(content: unknown): string {
  const descr = (content as { descr?: unknown } | null)?.descr
  return typeof descr === 'string' ? descr : ''
}

// a group's name is its path, levels joined by the one character a file name cannot hold, so a level may spell itself
// any way a tool does (`golangci-lint`) and the name still splits back into the path it came from
function groupName(parts: Array<string>): string {
  return parts.join('/')
}

// a term names a run of whole levels: the group itself, or a folder above it, which stands for everything it holds.
// `claude` is ai/agent/claude, `ai` is every group under ai/, `ai/agent` every one under ai/agent/, and `c` is nothing
function matchesNameParts(groupParts: Array<string>, query: string): boolean {
  const queryParts = query.toLowerCase().split('/')
  for (let at = 0; at + queryParts.length <= groupParts.length; at++) {
    if (queryParts.every((q, i) => groupParts[at + i].toLowerCase() === q)) {
      return true
    }
  }
  return false
}

// the acting ops' question: is this a name the group goes by. its own name or an alias, whole, and never what is
// inside it — a package a group happens to hold is not a name for the group, and reaching the group through one would
// install everything else in it
function isGroupNamed(groupParts: Array<string>, content: unknown, query: string): boolean {
  return matchesNameParts(groupParts, query) || groupAliases(content).some((a) => sameName(a, query))
}

// a group provides a manager when it goes by that manager's name, its own or an alias: lang/python is also uv, lang/node
// pnpm, sys/manager/ghpm ghpm. it is a forecast, not a promise — the path that wins here may put down something else —
// so the client still checks the manager is there before a group waiting on it runs
function groupProvides(groupParts: Array<string>, content: unknown): Array<string> {
  const own = groupParts.at(-1) ?? ''
  return MANAGERS.filter((m) => sameName(own, m) || groupAliases(content).some((a) => sameName(a, m)))
}

// a manager's name for a package can carry its flags (`--cask keka`), which are not part of the name
function withoutFlags(name: string): string {
  return name.split(' ').filter((w) => !w.startsWith('-')).join(' ')
}

// find's question is the wider one, since its job is to turn something half remembered into a name to type: the
// term starts a word of the group's name, an alias, a package any manager declares for it, or its description
function isGroupFound(groupParts: Array<string>, content: unknown, query: string): boolean {
  return wordStartsWith(groupName(groupParts), query) ||
    groupAliases(content).some((a) => wordStartsWith(a, query)) ||
    groupPackageNames(content).some((n) => wordStartsWith(withoutFlags(n), query)) ||
    wordStartsWith(groupDescr(content), query)
}

type FindCandidate = { manager: string; pkg: string }
type FindEntry = { label: string; candidates: Array<FindCandidate> }

// a group is on offer here if this platform has a manager it names, or its own add script is gated in. the managers
// it names are only candidates, in GROUP_ORDER: whether one is really on this machine is the client's to answer
async function groupCandidates(
  shell: Sh,
  name: string,
  // deno-lint-ignore no-explicit-any
  content: any,
  allManagers: Array<string> | null,
  context: Ctx | null,
): Promise<Array<FindCandidate> | null> {
  if (!allManagers || !context) {
    return []
  }
  const managerConfig = (groupOp(content, 'add')?.manager ?? {}) as Record<string, ManagerEntry>
  const tool = groupTool(name)
  const script = (await toolsWithScript('add')).has(tool) ? await resolveToolScript(shell, context, 'add', tool) : null
  const candidates: Array<FindCandidate> = []
  for (const tier of groupOrdered([...Object.keys(managerConfig), ...(script ? [SCRIPT_PATH] : [])])) {
    if (tier === SCRIPT_PATH) {
      candidates.push({ manager: SCRIPT_PATH, pkg: `${tool}/add` })
      continue
    }
    const entry = managerConfig[tier]
    if (!entry?.names?.length || !allManagers.includes(tier) || !evaluateGate(entry.gate, context)) {
      continue
    }
    candidates.push({ manager: tier, pkg: entry.names.join(', ') })
  }
  return candidates.length ? candidates : null
}

async function findGroups(
  shell: Sh,
  filters: Array<string> | undefined,
  allManagers: Array<string> | null,
  context: Ctx | null,
): Promise<{ entries: Array<FindEntry>; found: Array<string> }> {
  const results = await getGroupParts()
  const entries: Array<FindEntry> = []
  const found: Array<string> = []
  for (const r of results) {
    const name = groupName(r)
    const content = await loadGroupConfig(r, context ?? undefined)
    const candidates = await groupCandidates(shell, name, content, allManagers, context)
    if (candidates == null) {
      continue
    }
    if (filters?.length) {
      // each name is its own search, so a group is listed when any of them finds it
      const matched = filters.filter((f) => isGroupFound(r, content, f))
      if (!matched.length) {
        continue
      }
      for (const f of matched) {
        if (!found.includes(f)) {
          found.push(f)
        }
      }
    }
    entries.push({ label: name, candidates })
  }
  return { entries: entries.toSorted((a, b) => a.label.localeCompare(b.label)), found }
}

function printGroups(shell: Sh, entries: Array<FindEntry>, remaining: Array<string>) {
  if (!entries.length && !remaining.length) {
    return shell
  }
  const groups = Object.fromEntries(entries.map((e) => [e.label, e.candidates]))
  return shell
    .with(shell.varSetStr(PACK_FIND_KEY, JSON.stringify({ groups, remaining })))
    .with(entries.length ? ['packFindShow'] : [])
    .with(remaining.length ? ['packFindSearch'] : [])
}

function setOpNames(shell: Sh, op: string, names: Array<string>) {
  return shell.with(
    shell.varSetArr(PACK_OP_NAMES_KEY(op), names),
  )
}

interface ManagerEntry {
  names: Array<string>
  gate?: Record<string, Array<string>>
}

function processManagerEntryLines(shell: Sh, op: string, manager: string, entry: ManagerEntry): Array<string> {
  return [
    shell.varSetStr(PACK_MANAGER_KEY, manager),
    shell.varSetArr(PACK_OP_NAMES_KEY(op), entry.names),
    getManagerCallName(manager),
    shell.varUnSet(PACK_MANAGER_KEY),
  ]
}

// what the client asks of a script before it runs it, the same gates `script exec` asks
type ScriptGates = Omit<ToolScript, 'shell' | 'run'>

function scriptGates(script: ToolScript): ScriptGates {
  const { shell: _shell, run: _run, ...gates } = script
  return gates
}

// a script path carries its gates: the client asks them to know whether that path holds the group here, as it asks a
// manager whether it has the package
type PlanPath = { id: string; manager: string; names: Array<string>; gates?: ScriptGates }
type PlanScript = { id: string } & ScriptGates
type PlanUnit = {
  group: string
  name: string
  paths: Array<PlanPath>
  // the managers this group puts down, so a group they serve in the same run can wait for it
  provides?: Array<string>
  pre?: Array<PlanScript>
  post?: Array<PlanScript>
  // the group's own file.yaml key, whose name is the tool's bin
  files?: { key: string } & FilePlan
}

// a hook runs the way `script exec <action> <tool>` runs it. its arm is keyed by tool/action alone, so the client runs
// each once
function scriptArm(shell: Sh, id: string, script: ToolScript): Array<string> {
  return [`    ${shell.toLiteral(id)} => {`, `      ${script.run}`, '    }']
}

// one install path becomes a row the client can choose plus an arm it can run, so code stays code and the
// plan stays data
async function buildGroupUnit(
  shell: Sh,
  context: Ctx,
  op: string,
  allManagers: Array<string>,
  name: string,
  cliName: string,
): Promise<{ unit: PlanUnit | null; arms: Array<string>; scriptArms: Map<string, Array<string>> }> {
  const content = await loadGroupConfig(name.split('/'), context)

  const tool = groupTool(name)
  const managerConfig = (groupOp(content, 'add')?.manager ?? {}) as Record<string, ManagerEntry>
  const own = async (action: string) =>
    (await toolsWithScript(action)).has(tool) ? await resolveToolScript(shell, context, action, tool) : null
  const script = OWN_PATHS.includes(op) ? await own(op) : null

  const paths: Array<PlanPath> = []
  const arms: Array<string> = []

  const addArm = (id: string, lines: Array<string>) => {
    arms.push(`    ${shell.toLiteral(id)} => {`, ...lines, '    }')
  }

  // the managers first, in GROUP_ORDER, the group's own add script where that order puts it. a sync script comes after
  // every manager, since what it puts back is what their update undid
  const tiers = groupOrdered([...Object.keys(managerConfig), ...(script && op !== 'sync' ? [SCRIPT_PATH] : [])])
  for (const tier of [...tiers, ...(script && op === 'sync' ? [SCRIPT_PATH] : [])]) {
    const id = `${name}|${tier}`
    if (tier === SCRIPT_PATH) {
      if (script) {
        paths.push({ id, manager: SCRIPT_PATH, names: [`${tool}/${op}`], gates: scriptGates(script) })
        addArm(id, [`      ${script.run}`])
      }
      continue
    }
    const entry = managerConfig[tier]
    if (!entry?.names?.length || !allManagers.includes(tier) || !evaluateGate(entry.gate, context)) {
      continue
    }
    paths.push({ id, manager: tier, names: entry.names })
    addArm(id, processManagerEntryLines(shell, op, tier, entry))
  }

  if (!paths.length) {
    return { unit: null, arms, scriptArms: new Map() }
  }
  const unit: PlanUnit = { group: name, name: cliName, paths }
  const files = OWN_FILE_OPS.includes(op) ? await ownFilePlan(shell, context, tool) : null
  if (files) {
    unit.files = { key: tool, ...files }
  }
  const provides = groupProvides(name.split('/'), content)
  if (provides.length) {
    unit.provides = provides
  }
  const scriptArms = new Map<string, Array<string>>()
  for (const [hook, action] of Object.entries(OWN_HOOKS[op] ?? {}) as Array<['pre' | 'post', string]>) {
    const hookScript = await own(action)
    // gated out on this platform: the group is still installed or removed, there is just nothing to run here
    if (!hookScript) {
      continue
    }
    const id = `${tool}/${action}`
    unit[hook] = [{ id, ...scriptGates(hookScript) }]
    scriptArms.set(id, scriptArm(shell, id, hookScript))
  }
  return { unit, arms, scriptArms }
}

// every group's own script for a bare sync or tidy, gated by platform here and by the client's gates there. a group
// that provides a manager says so, since its sync is that manager updating itself, due before the manager's own
async function findOwnScripts(
  shell: Sh,
  context: Ctx,
  action: string,
): Promise<{ scripts: Array<{ group: string; provides: Array<string> } & PlanScript>; arms: Array<string> }> {
  const tools = await toolsWithScript(action)
  const scripts: Array<{ group: string; provides: Array<string> } & PlanScript> = []
  const arms: Array<string> = []
  for (const parts of await getGroupParts()) {
    const name = groupName(parts)
    const tool = groupTool(name)
    if (!tools.has(tool)) {
      continue
    }
    const script = await resolveToolScript(shell, context, action, tool)
    if (!script) {
      continue
    }
    const id = `${tool}/${action}`
    const provides = groupProvides(parts, await loadGroupConfig(parts, context))
    scripts.push({ group: name, provides, id, ...scriptGates(script) })
    arms.push(...scriptArm(shell, id, script))
  }
  return { scripts, arms }
}

async function resolveGroupName(name: string): Promise<Array<string>> {
  const results = await getGroupParts()
  const matched: Array<string> = []
  const aliasMatched: Array<string> = []
  for (const parts of results) {
    const resolvedName = groupName(parts)
    if (matched.includes(resolvedName) || aliasMatched.includes(resolvedName)) {
      continue
    }
    if (matchesNameParts(parts, name)) {
      matched.push(resolvedName)
      continue
    }
    if (isGroupNamed(parts, await loadGroupConfig(parts), name)) {
      aliasMatched.push(resolvedName)
    }
  }

  // a name and a folder of the same name are one group: python.yaml and everything under python/.
  // an alias reaches the folder the same way, since it stands in for the name
  const all = [...matched, ...aliasMatched]
  for (const hit of [...all]) {
    const prefix = `${hit}/`
    for (const parts of results) {
      const resolvedName = groupName(parts)
      if (resolvedName.startsWith(prefix) && !all.includes(resolvedName)) {
        all.push(resolvedName)
      }
    }
  }
  return all
}

async function buildPlan(
  shell: Sh,
  context: Ctx,
  op: string,
  allManagers: Array<string>,
  names: Array<string>,
): Promise<{ units: Array<PlanUnit>; arms: Array<string>; claimed: Array<string> }> {
  const units: Array<PlanUnit> = []
  const arms: Array<string> = []
  const claimed: Array<string> = []
  const seen = new Set<string>()
  const scriptArms = new Map<string, Array<string>>()

  for (const name of names) {
    for (const resolvedName of await resolveGroupName(name)) {
      // a name and a folder of that name are one group, and a group reached twice is still installed once
      if (seen.has(resolvedName)) {
        continue
      }
      seen.add(resolvedName)
      const { unit, arms: unitArms, scriptArms: unitScriptArms } = await buildGroupUnit(
        shell,
        context,
        op,
        allManagers,
        resolvedName,
        name,
      )
      if (unit) {
        units.push(unit)
        arms.push(...unitArms)
        for (const [id, lines] of unitScriptArms) {
          scriptArms.set(id, lines)
        }
        if (!claimed.includes(name)) {
          claimed.push(name)
        }
      }
    }
  }

  return { units, arms: [...arms, ...[...scriptArms.values()].flat()], claimed }
}

// every group's own files, for a bare sync to offer where the tool is here
async function findOwnFiles(shell: Sh, context: Ctx): Promise<Array<{ group: string; key: string } & FilePlan>> {
  const found: Array<{ group: string; key: string } & FilePlan> = []
  for (const parts of await getGroupParts()) {
    const name = groupName(parts)
    const key = groupTool(name)
    const plan = await ownFilePlan(shell, context, key)
    if (plan) {
      found.push({ group: name, key, ...plan })
    }
  }
  return found
}

// a bare sync or tidy is the managers' plan, with every group's own script for the op beside them as one more row, and
// for a sync every group's own files as another
async function withOwnScripts(shell: Sh, context: Ctx, op: string): Promise<Sh> {
  const { scripts, arms } = await findOwnScripts(shell, context, op)
  const files = op === 'sync' ? await findOwnFiles(shell, context) : []
  return shell
    .with(shell.varSetStr(PACK_FILES_KEY, JSON.stringify(files)))
    .with([
      'def --env packRunUnit [id: string] {',
      '  match $id {',
      ...arms,
      '    _ => {}',
      '  }',
      '}',
    ])
    .with(shell.varSetStr(PACK_SCRIPTS_KEY, JSON.stringify(scripts)))
    .with(lockRun(shell, `${PACK_KEY} ${op}`, ['packManagerPlanRun']))
}

async function execOp(
  shell: Sh,
  context: Ctx,
  environment: Env,
  op: string,
): Promise<string> {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  const { shell: _shell, allManagers } = await initOp(shell, op)
  let result = _shell

  if (allManagers.length) {
    result = result.with(result.varSetArr(PACK_MANAGERS_KEY, allManagers))
  }

  if (op === 'tidy') {
    return buildAndLog(await withOwnScripts(result, context, op), environment)
  }

  if (op === 'pull') {
    return buildAndLog(result.with(lockRun(result, `${PACK_KEY} ${op}`, ['packManagerPlanRun'])), environment)
  }

  const names = environment.getSplit(PACK_OP_NAMES_KEY(op))

  if (op === 'find') {
    const hasContext = context.sys_os_plat || context.sys_os
    const { entries: groupEntries, found } = await findGroups(
      result,
      names.length ? names : undefined,
      hasContext ? allManagers : null,
      hasContext ? context : null,
    )
    const remaining = names.filter((n) => !found.includes(n))
    result = printGroups(result, groupEntries, remaining)

    return buildAndLog(result, environment)
  } else if (op === 'add' || op === 'remove' || op === 'renew' || (op === 'sync' && names.length)) {
    // a named sync asks the same question remove does — which manager holds this — with a different verb, so it
    // resolves through the plan rather than handing every manager a name it never installed
    const { units, arms, claimed } = await buildPlan(
      result,
      context,
      op,
      allManagers,
      names,
    )

    // names no group claimed have no stated manager, so the client finds one for them
    const loose = names.filter((n) => !claimed.includes(n))

    result = result
      .with([
        'def --env packRunUnit [id: string] {',
        '  match $id {',
        ...arms,
        '    _ => {}',
        '  }',
        '}',
      ])
      .with(result.varSetStr(PACK_PLAN_KEY, JSON.stringify(units)))
    // always stated, since the env dump has already set this key to the raw cli names
    result = result.with(result.varSetArr(PACK_OP_NAMES_KEY(op), loose))
    result = result.with(lockRun(result, `${PACK_KEY} ${op}`, ['packPlanRun']))

    return buildAndLog(result, environment)
  } else if (op === 'sync') {
    return buildAndLog(await withOwnScripts(result, context, op), environment)
  }

  if (op === 'info' && names.length) {
    // info asks every manager, so it has no plan to pick from — but a group still knows each manager's own name
    // for what was typed, and asking pacman about `nu` when the group says `nushell` is asking about nothing
    const { units, claimed } = await buildPlan(result, context, op, allManagers, names)
    const declared: Record<string, Array<string>> = {}
    for (const unit of units) {
      for (const path of unit.paths) {
        declared[path.manager] = [...new Set([...(declared[path.manager] ?? []), ...path.names])]
      }
    }
    result = result.with(result.varSetStr(PACK_INFO_MAP_KEY, JSON.stringify(declared)))
    // a name no group claimed is asked as typed, of everyone, the way it always was
    const loose = names.filter((n) => !claimed.includes(n))
    result = setOpNames(result, op, loose)
    // with nothing loose to ask about, a manager the groups never named has no question to put: it is not offered
    if (!loose.length) {
      result = result.with(
        result.varSetArr(PACK_MANAGERS_KEY, allManagers.filter((m) => declared[m]?.length)),
      )
    }
    result = result.with(lockRun(result, `${PACK_KEY} ${op}`, ['packManagerPlanRun']))

    return buildAndLog(result, environment)
  }

  if (op === 'list' || op === 'outdated' || op === 'info') {
    result = setOpNames(result, op, names)
    // list and outdated filter what is installed, and that is answerable locally, so a term resolves before either
    // asks. info reaches the network whatever it is given, so its only question stays which managers to run
    const local = op === 'list' || op === 'outdated'
    const run = local
      ? [`packTermPlanRun ${result.toLiteral(joinKey(...PACK_OP_NAMES_KEY(op)))}`]
      : ['packManagerPlanRun']
    result = result.with(op === 'list' ? run : lockRun(result, `${PACK_KEY} ${op}`, run))
  }

  return buildAndLog(result, environment)
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.description = 'add on local'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', required: true },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdInfo extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'info'
    this.description = 'show details for package(s) from remote'
    this.aliases = ['i', 'show']
    this.arguments = [{ name: 'names', description: 'name(s) to look up' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.description = 'list on local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdOutdated extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'outdated'
    this.description = 'list out of sync on local'
    this.aliases = ['o', 'ou', 'out', 'stale']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdPull extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pull'
    this.description = 'pull indexes from remote'
    this.aliases = ['p', 'refresh', 'rf']
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdRemove extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'remove'
    this.description = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'un', 'unin', 'uninstall']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', required: true },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdRenew extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'renew'
    this.description = 'renew on local: a fresh copy of what is here'
    this.aliases = ['rn']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', required: true },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.description = 'sync from remote'
    this.aliases = ['s', 'sy', 'up', 'update']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.description = 'tidy on local'
    this.aliases = ['t', 'ti', 'cl', 'clean']
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}
