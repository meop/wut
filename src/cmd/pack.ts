import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileContent, getCfgFileLoad } from '../cfg.ts'
import { execScriptShell, getScriptFlavorOpPreamble, redirectCommonShell } from '../sh.ts'

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
  'scoop',
  'choco',
  'winget',
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

export const SCRIPT_PATH = 'script'

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

export function parseScriptFilePath(
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

export function getManagerFuncName(manager: string, prefix = PACK_KEY) {
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
  const preamble = await getScriptFlavorOpPreamble(plat, shellFlavor)
  const scriptContent = preamble ? `${preamble}\n${fileContent}` : fileContent
  return [`if 'NOOP' not-in $env { ${execScriptShell(shell, plat, shellFlavor, scriptContent)} }`]
}

async function loadManagerFiles(
  shell: Sh,
  managers: Array<string>,
) {
  let _shell = shell
    .with(await shell.fileLoad(['sel'], import.meta.resolve, ['..']))
    .with(await shell.fileLoad([PACK_KEY], import.meta.resolve, ['..']))
  const loadedFiles = new Set<string>()
  for (const manager of managers) {
    const fileKey = managerAliasMap[manager] ?? manager
    if (!loadedFiles.has(fileKey)) {
      _shell = _shell
        .with(
          await _shell.fileLoad(
            [PACK_KEY, fileKey],
            import.meta.resolve,
            ['..'],
          ),
        )
      loadedFiles.add(fileKey)
    }
  }
  return _shell
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
  let _shell = shell.with(shell.varSetStr(PACK_OP_KEY, op))
  const allManagers = getSupportedManagers()
  _shell = await loadManagerFiles(_shell, allManagers)
  return { shell: _shell, allManagers }
}

async function loadGroupConfig(parts: Array<string>) {
  return await getCfgFileLoad([PACK_KEY, ...parts], { extension: Fmt.yaml })
}

// operations live under 'operation', beside the group's own metadata
// deno-lint-ignore no-explicit-any
function groupOp(content: any, op: 'add' | 'remove'): any {
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

export type FindCandidate = { manager: string; pkg: string }
export type FindEntry = { label: string; candidates: Array<FindCandidate> }

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
      if (selected?.entry.file) {
        candidates.push({ manager: SCRIPT_PATH, pkg: selected.entry.file })
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

interface HookEntry {
  hooks?: Array<string>
}

interface ManagerEntry {
  names: Array<string>
  gate?: Record<string, Array<string>>
  pwsh?: HookEntry
  zsh?: HookEntry
}

type RemManagerEntry = Record<string, HookEntry>

export interface ScriptEntry {
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

  if (op === 'add') {
    const preHook = entry[nativeShell as 'pwsh' | 'zsh']
    if (preHook?.hooks?.length) {
      lines.push(...buildCmdRunLines(shell, plat, nativeShell, preHook.hooks, true))
    }
  }

  lines.push(shell.varSetArr(PACK_OP_NAMES_KEY(op), entry.names))
  lines.push(getManagerCallName(manager))

  if (op === 'remove') {
    const postHook = remEntry?.[nativeShell]
    if (postHook?.hooks?.length) {
      lines.push(...buildCmdRunLines(shell, plat, nativeShell, postHook.hooks, true))
    }
  }

  lines.push(shell.varUnSet(PACK_MANAGER_KEY))

  return lines
}

export type PlanPath = { id: string; manager: string; names: Array<string> }
export type PlanUnit = { group: string; name: string; paths: Array<PlanPath> }

// one install path becomes a row the client can choose plus an arm it can run, so code stays code and the
// plan stays data
async function buildGroupUnit(
  shell: Sh,
  context: Ctx,
  op: string,
  allManagers: Array<string>,
  name: string,
  cliName: string,
): Promise<{ unit: PlanUnit | null; arms: Array<string> }> {
  const content = await loadGroupConfig(name.split('-'))
  if (content == null) {
    return { unit: null, arms: [] }
  }

  const addConfig = groupOp(content, 'add') as Record<string, unknown> | undefined
  const remConfig = groupOp(content, 'remove')?.manager as Record<string, RemManagerEntry> | undefined
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

  return { unit: paths.length ? { group: name, name: cliName, paths } : null, arms }
}

export async function resolveGroupName(name: string): Promise<Array<string>> {
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
      const { unit, arms: unitArms } = await buildGroupUnit(
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
        if (!claimed.includes(name)) {
          claimed.push(name)
        }
      }
    }
  }

  return { units, arms, claimed }
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
  } else if (op === 'add' || op === 'remove') {
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
    if (names.length) {
      result = setOpNames(result, op, names)
    }
    result = result.with(['packManagerPlanRun'])

    return buildAndLog(result, environment)
  }

  if (op === 'list' || op === 'outdated' || op === 'info') {
    result = setOpNames(result, op, names)
    result = result.with(['packManagerPlanRun'])
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
