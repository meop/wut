import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { joinKey } from '@meop/shire/reg'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileContent, getCfgFileLoad } from '../cfg.ts'
import { execScriptShell, getScriptFlavorOpPreamble, redirectCommonShell } from '../sh.ts'
import { resolveToolScript } from './script.ts'

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
      new PackCmdRemove([...this.scopes, this.name]),
      new PackCmdSync([...this.scopes, this.name]),
      new PackCmdTidy([...this.scopes, this.name]),
    ]
  }
}

// every manager wut knows, in the order to prefer them. which of these a machine actually has is a question only
// the client can answer, so there is no platform or distro map here to go stale
const PORTABLE_MANAGERS: Array<string> = [
  'ghpm',
  'cargo',
  'deno',
  'bun',
  'pnpm',
  'uv',
]

const NATIVE_MANAGERS: Array<string> = [
  'brew',
  'paru',
  'yay',
  'pacman',
  'apk',
  'apt',
  'dnf',
  'xbps',
  'zypper',
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
// the standalone installs a bare sync asks the client to look for
const PACK_SELF_KEY = [PACK_KEY, 'self']

const SCRIPT_PATH = 'script'

export function getSupportedManagers(): Array<string> {
  return [...MANAGERS]
}

function getNativeShellForPlat(plat: string): string {
  return plat === 'windows' ? 'pwsh' : 'zsh'
}

export function selectScriptEntry(
  scriptConfig: Record<string, ScriptEntry> | undefined,
  context: Ctx,
): { shellFlavor: string; entry: ScriptEntry } | null {
  for (const [shellFlavor, entry] of Object.entries(scriptConfig ?? {})) {
    if (evaluateGate(entry.gate, context)) {
      return { shellFlavor, entry }
    }
  }
  return null
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

function parseScriptFilePath(
  filePath: string,
): { parts: Array<string>; ext: string } {
  const stripped = filePath.replace(/^cfg\//, '')
  const parts = stripped.split('/')
  const last = parts[parts.length - 1]
  const dotIdx = last.lastIndexOf('.')
  if (dotIdx >= 0) {
    parts[parts.length - 1] = last.slice(0, dotIdx)
    return { parts, ext: last.slice(dotIdx + 1) }
  }
  return { parts, ext: '' }
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

function buildCmdRunLines(
  shell: Sh,
  plat: string,
  shellFlavor: string,
  commands: Array<string>,
  announce: boolean,
): Array<string> {
  return [
    ...(announce ? commands.flatMap((cmd) => shell.print(`  ${cmd}`)) : []),
    `if 'NOOP' not-in $env { ${execScriptShell(shell, plat, shellFlavor, commands.join('\n'))} }`,
  ]
}

async function buildFileRunLines(
  shell: Sh,
  plat: string,
  shellFlavor: string,
  filePath: string,
): Promise<Array<string> | null> {
  const { parts, ext } = parseScriptFilePath(filePath)
  const fileContent = await getCfgFileContent(parts, { extension: ext })
  if (!fileContent) {
    return null
  }
  const preamble = await getScriptFlavorOpPreamble(shellFlavor)
  const scriptContent = preamble ? `${preamble}\n${fileContent}` : fileContent
  return [`if 'NOOP' not-in $env { ${execScriptShell(shell, plat, shellFlavor, scriptContent)} }`]
}

// the ops a manager states it can do, read from the arms of its own `match $env.PACK_OP`. derived rather than
// listed, so a manager gaining or losing an op is one edit in one file
const ARM_OPS = ['add', 'info', 'list', 'outdated', 'remove', 'sync', 'tidy']

function managerFileOps(content: string): Array<string> {
  return ARM_OPS.filter((op) => new RegExp(`^ {4}${op} => \\{$`, 'm').test(content))
}

async function loadManagerFiles(
  shell: Sh,
  managers: Array<string>,
) {
  let _shell = shell
    .with(await shell.fileLoad(['sel'], import.meta.resolve, ['..']))
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
  const allManagers = ARM_OPS.includes(op) ? supported.filter((m) => opsByManager.get(m)?.includes(op)) : supported
  return { shell: _shell, allManagers }
}

async function loadGroupConfig(parts: Array<string>) {
  return await getCfgFileLoad([PACK_KEY, ...parts], { extension: Fmt.yaml })
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

function matchesNameParts(groupParts: Array<string>, queryParts: Array<string>, query: string): boolean {
  if (queryParts.length > groupParts.length) {
    return false
  }
  const isPrefix = groupParts.slice(0, queryParts.length).every((p, i) => p === queryParts[i])
  const isSuffix = groupParts.slice(groupParts.length - queryParts.length).every((p, i) => p === queryParts[i])
  const isLastPart = groupParts[groupParts.length - 1] === query
  return isPrefix || isSuffix || isLastPart
}

// add and find both resolve a typed name the same way: the group's own path segments (prefix/suffix/last-part),
// or a startsWith hit on an alias or a declared package name
function matchesGroupQuery(groupParts: Array<string>, content: unknown, query: string): boolean {
  if (matchesNameParts(groupParts, query.split('-'), query)) {
    return true
  }
  const q = query.toLowerCase()
  return groupAliases(content).some((a) => a.toLowerCase().startsWith(q)) ||
    groupPackageNames(content).some((n) => n.toLowerCase().startsWith(q))
}

type FindCandidate = { manager: string; pkg: string }
type FindEntry = { label: string; candidates: Array<FindCandidate> }

// a group is on offer here if this platform has a manager it names, or its script is gated in. the managers it names
// are only candidates, in declared order: whether one is really on this machine is the client's to answer
function groupCandidates(
  // deno-lint-ignore no-explicit-any
  content: any,
  allManagers: Array<string> | null,
  context: Ctx | null,
): Array<FindCandidate> | null {
  if (!allManagers || !context) {
    return []
  }
  const managerConfig = (groupOp(content, 'add')?.manager ?? {}) as Record<string, ManagerEntry>
  const candidates: Array<FindCandidate> = []
  for (const tier of Object.keys(managerConfig)) {
    if (tier === SCRIPT_PATH) {
      const selected = selectScriptEntry(managerConfig[tier] as unknown as Record<string, ScriptEntry>, context)
      // inline commands are as much an install path as a file, and a group whose only path here is one must still show
      const pkg = selected?.entry.file ?? selected?.entry.commands?.join(' ')
      if (pkg) {
        candidates.push({ manager: SCRIPT_PATH, pkg })
      }
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
  filters: Array<string> | undefined,
  allManagers: Array<string> | null,
  context: Ctx | null,
): Promise<{ entries: Array<FindEntry>; found: Array<string> }> {
  const results = await getCfgDirDump([PACK_KEY], {
    extension: Fmt.yaml,
    flexible: true,
  })
  const entries: Array<FindEntry> = []
  const found: Array<string> = []
  for (const r of results) {
    const name = r.join('-')
    const content = await loadGroupConfig(r)
    if (content == null) {
      continue
    }
    const candidates = groupCandidates(content, allManagers, context)
    if (candidates == null) {
      continue
    }
    if (filters?.length) {
      const matched = filters.filter((f) => matchesGroupQuery(r, content, f))
      if (matched.length !== filters.length) {
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

// commands run around one manager's call, in the platform's native shell
interface HookEntry {
  pre?: Array<string>
  post?: Array<string>
}

interface ManagerEntry {
  names: Array<string>
  gate?: Record<string, Array<string>>
  pwsh?: HookEntry
  zsh?: HookEntry
}

type RemManagerEntry = Record<string, HookEntry>

interface ScriptEntry {
  commands?: Array<string>
  file?: string
  gate?: Record<string, Array<string>>
}

function processManagerEntryLines(
  shell: Sh,
  context: Ctx,
  op: string,
  manager: string,
  entry: ManagerEntry,
  remEntry?: RemManagerEntry,
): Array<string> {
  const lines: Array<string> = []
  const nativeShell = getNativeShellForPlat(context.sys_os_plat ?? '')
  const plat = context.sys_os_plat ?? ''

  lines.push(shell.varSetStr(PACK_MANAGER_KEY, manager))

  // add states its hooks beside the names it installs; remove, which declares no names of its own, beside nothing
  const hooks = op === 'add'
    ? entry[nativeShell as 'pwsh' | 'zsh']
    : op === 'remove'
    ? remEntry?.[nativeShell]
    : undefined

  if (hooks?.pre?.length) {
    lines.push(...buildCmdRunLines(shell, plat, nativeShell, hooks.pre, true))
  }

  lines.push(shell.varSetArr(PACK_OP_NAMES_KEY(op), entry.names))
  lines.push(getManagerCallName(manager))

  if (hooks?.post?.length) {
    lines.push(...buildCmdRunLines(shell, plat, nativeShell, hooks.post, true))
  }

  lines.push(shell.varUnSet(PACK_MANAGER_KEY))

  return lines
}

type PlanPath = { id: string; manager: string; names: Array<string> }

// a group whose own installer puts it somewhere it can update itself from states that path per platform, and what to
// hand the binary there to make it do so
type SelfUpdate = { group: string; path: string; args: Array<string> }

function groupSelfUpdate(content: unknown, group: string, plat: string): SelfUpdate | null {
  const entry = groupOp(content, 'sync')?.[SCRIPT_PATH] as { path?: Record<string, string>; args?: Array<string> }
  const path = entry?.path?.[plat]
  return path && entry.args?.length ? { group, path, args: entry.args } : null
}

async function findSelfUpdates(plat: string): Promise<Array<SelfUpdate>> {
  const found: Array<SelfUpdate> = []
  for (const parts of await getCfgDirDump([PACK_KEY], { extension: Fmt.yaml, flexible: true })) {
    const self = groupSelfUpdate(await loadGroupConfig(parts), parts.join('-'), plat)
    if (self) {
      found.push(self)
    }
  }
  return found
}
type PlanScript = { id: string; cmds: Array<string> }
type PlanUnit = {
  group: string
  name: string
  paths: Array<PlanPath>
  pre?: Array<PlanScript>
  post?: Array<PlanScript>
}

const GROUP_HOOKS = ['pre', 'post'] as const

// a group hook names a script as tool/action — its path under cfg/script — and it runs the way `script exec <action>
// <tool>` runs it. its arm is keyed by that path alone, so two groups naming the same script share one arm and the
// client runs it once
async function buildGroupScripts(
  shell: Sh,
  context: Ctx,
  refs: Array<string>,
): Promise<{ scripts: Array<PlanScript>; arms: Map<string, Array<string>> }> {
  const scripts: Array<PlanScript> = []
  const arms = new Map<string, Array<string>>()
  for (const ref of refs) {
    const parts = ref.split('/')
    const action = parts.pop() ?? ''
    const resolved = await resolveToolScript(shell, context, action, parts.join('/'))
    // gated out on this platform: the group is still installed or removed, there is just nothing to run here
    if (!resolved) {
      continue
    }
    scripts.push({ id: ref, cmds: resolved.cmds })
    arms.set(ref, [`    ${shell.toLiteral(ref)} => {`, `      ${resolved.run}`, '    }'])
  }
  return { scripts, arms }
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
  const content = await loadGroupConfig(name.split('-'))
  if (content == null) {
    return { unit: null, arms: [], scriptArms: new Map() }
  }

  const addConfig = groupOp(content, 'add') as Record<string, unknown> | undefined
  const removeConfig = groupOp(content, 'remove') as Record<string, unknown> | undefined
  const remConfig = removeConfig?.manager as Record<string, RemManagerEntry> | undefined
  const plat = context.sys_os_plat ?? ''
  const managerConfig = (addConfig?.manager ?? {}) as Record<string, ManagerEntry>

  const paths: Array<PlanPath> = []
  const arms: Array<string> = []

  const addArm = (id: string, lines: Array<string>) => {
    arms.push(`    ${shell.toLiteral(id)} => {`, ...lines, '    }')
  }

  for (const tier of Object.keys(managerConfig)) {
    const id = `${name}|${tier}`
    if (tier === SCRIPT_PATH) {
      if (op !== 'add') {
        continue
      }
      const selected = selectScriptEntry(
        managerConfig[tier] as unknown as Record<string, ScriptEntry> | undefined,
        context,
      )
      if (!selected) {
        continue
      }
      const { shellFlavor, entry } = selected
      const lines = entry.commands?.length
        ? buildCmdRunLines(shell, plat, shellFlavor, entry.commands, false)
        : entry.file
        ? await buildFileRunLines(shell, plat, shellFlavor, entry.file)
        : null
      if (!lines) {
        continue
      }
      paths.push({ id, manager: SCRIPT_PATH, names: [entry.file ?? entry.commands?.join(' ') ?? ''] })
      addArm(id, lines)
      continue
    }
    const entry = managerConfig[tier]
    if (!entry?.names?.length || !allManagers.includes(tier) || !evaluateGate(entry.gate, context)) {
      continue
    }
    paths.push({ id, manager: tier, names: entry.names })
    addArm(id, processManagerEntryLines(shell, context, op, tier, entry, remConfig?.[tier]))
  }

  // a sync of a standalone install is that tool updating itself, so it is held — and offered — wherever its file is
  const self = op === 'sync' ? groupSelfUpdate(content, name, plat) : null
  if (self) {
    const id = `${name}|${SCRIPT_PATH}`
    paths.push({ id, manager: SCRIPT_PATH, names: [self.path] })
    const args = self.args.map((a) => shell.toLiteral(a)).join(' ')
    addArm(id, [`      packSelfUpdate ${shell.toLiteral(name)} ${shell.toLiteral(self.path)} [${args}]`])
  }

  if (!paths.length) {
    return { unit: null, arms, scriptArms: new Map() }
  }
  const unit: PlanUnit = { group: name, name: cliName, paths }
  const scriptArms = new Map<string, Array<string>>()
  const opConfig = op === 'add' ? addConfig : op === 'remove' ? removeConfig : undefined
  for (const hook of GROUP_HOOKS) {
    const refs = opConfig?.[hook]
    if (!Array.isArray(refs)) {
      continue
    }
    const { scripts, arms: hookArms } = await buildGroupScripts(shell, context, refs as Array<string>)
    if (scripts.length) {
      unit[hook] = scripts
    }
    for (const [id, lines] of hookArms) {
      scriptArms.set(id, lines)
    }
  }
  return { unit, arms, scriptArms }
}

async function resolveGroupName(name: string): Promise<Array<string>> {
  const nameParts = name.split('-')
  const results = await getCfgDirDump([PACK_KEY], {
    extension: Fmt.yaml,
    flexible: true,
  })
  const matched: Array<string> = []
  const aliasMatched: Array<string> = []
  for (const parts of results) {
    const resolvedName = parts.join('-')
    if (matched.includes(resolvedName) || aliasMatched.includes(resolvedName)) {
      continue
    }
    if (matchesNameParts(parts, nameParts, name)) {
      matched.push(resolvedName)
      continue
    }
    const content = await loadGroupConfig(parts)
    const q = name.toLowerCase()
    if (
      groupAliases(content).some((a) => a.toLowerCase().startsWith(q)) ||
      groupPackageNames(content).some((n) => n.toLowerCase().startsWith(q))
    ) {
      aliasMatched.push(resolvedName)
    }
  }

  // a name and a folder of the same name are one group: python.yaml and everything under python/.
  // an alias reaches the folder the same way, since it stands in for the name
  const all = [...matched, ...aliasMatched]
  for (const hit of [...all]) {
    const prefix = `${hit}-`
    for (const parts of results) {
      const resolvedName = parts.join('-')
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
    let resolved = await resolveGroupName(name)
    if (op === 'remove' && resolved.length > 1) {
      resolved = [resolved.find((r) => r === name) ?? resolved[0]]
    }
    for (const resolvedName of resolved) {
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
    return buildAndLog(result.with(['packManagerPlanRun']), environment)
  }

  const names = environment.getSplit(PACK_OP_NAMES_KEY(op))

  if (op === 'find') {
    const hasContext = context.sys_os_plat || context.sys_os
    const { entries: groupEntries, found } = await findGroups(
      names.length ? names : undefined,
      hasContext ? allManagers : null,
      hasContext ? context : null,
    )
    const remaining = names.filter((n) => !found.includes(n))
    result = printGroups(result, groupEntries, remaining)

    return buildAndLog(result, environment)
  } else if (op === 'add' || op === 'remove' || (op === 'sync' && names.length)) {
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
    result = result.with(['packPlanRun'])

    return buildAndLog(result, environment)
  } else if (op === 'sync') {
    result = result
      .with(result.varSetStr(PACK_SELF_KEY, JSON.stringify(await findSelfUpdates(context.sys_os_plat ?? ''))))
      .with(['packManagerPlanRun'])

    return buildAndLog(result, environment)
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
    result = result.with(['packManagerPlanRun'])

    return buildAndLog(result, environment)
  }

  if (op === 'list' || op === 'outdated' || op === 'info') {
    result = setOpNames(result, op, names)
    // list and outdated filter what is installed, and that is answerable locally, so a term resolves before either
    // asks. info reaches the network whatever it is given, so its only question stays which managers to run
    const local = op === 'list' || op === 'outdated'
    result = result.with(
      local ? [`packTermPlanRun ${result.toLiteral(joinKey(...PACK_OP_NAMES_KEY(op)))}`] : ['packManagerPlanRun'],
    )
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
