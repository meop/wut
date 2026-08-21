import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileContent, getCfgFileLoad } from '../cfg.ts'
import { execScriptShell, redirectCommonShell } from '../sh.ts'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.description = 'package manager ops'
    this.aliases = ['p', 'pa', 'pac', 'package']
    this.options = [
      { keys: ['-m', '--managers'], description: 'manager(s) to use, in order of preference' },
    ]
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
// sorted within each half, but a user space install is preferred over one that needs sudo, so the halves are
// not interchangeable: this list is the default preference order
const PORTABLE_MANAGERS: Array<string> = [
  'bun',
  'cargo',
  'deno',
  'ghpm',
  'pnpm',
  'uv',
]

const NATIVE_MANAGERS: Array<string> = [
  'apk',
  'apt',
  'brew',
  'choco',
  'dnf',
  'pacman',
  'paru',
  'scoop',
  'winget',
  'xbps',
  'yay',
  'zypper',
]

const MANAGERS: Array<string> = [...PORTABLE_MANAGERS, ...NATIVE_MANAGERS]

const PACK_KEY = 'pack'
const PACK_MANAGERS_KEY = [PACK_KEY, 'managers']
const PACK_MANAGER_KEY = [PACK_KEY, 'manager']
const PACK_OP_KEY = [PACK_KEY, 'op']
const PACK_OP_NAMES_KEY = (op: string) => [PACK_KEY, op, 'names']
// the units the client picks from, as data; their bodies live in packRunUnit
const PACK_PLAN_KEY = [PACK_KEY, 'plan']

// '-m pacman,ghpm' both narrows to those managers and states which to prefer, so the list order wins
export const SCRIPT_PATH = 'script'

export function getRequestedManagers(environment: Env): Array<string> {
  return (environment.get(PACK_MANAGERS_KEY) ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
}

// naming only 'script' leaves no managers at all, which is the point of naming it
export function getSupportedManagers(environment: Env): Array<string> {
  const asked = getRequestedManagers(environment)
  return asked.length ? asked.filter((m) => m !== SCRIPT_PATH && MANAGERS.includes(m)) : [...MANAGERS]
}

function getNativeShellForPlat(plat: string): string {
  return plat === 'winnt' ? 'pwsh' : 'zsh'
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
): Array<string> {
  return [
    ...commands.flatMap((cmd) => shell.print(`  ${cmd}`)),
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
  return [
    ...shell.print(`  ${filePath}`),
    `if 'NOOP' not-in $env { ${execScriptShell(shell, plat, shellFlavor, fileContent)} }`,
  ]
}

async function loadManagerFiles(
  shell: Sh,
  managers: Array<string>,
) {
  let _shell = shell.with(await shell.fileLoad([PACK_KEY], import.meta.resolve, ['..']))
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
  context: Ctx,
  environment: Env,
  op: string,
): Promise<
  {
    shell: Sh
    allManagers: Array<string>
  }
> {
  let _shell = shell.with(shell.varSetStr(PACK_OP_KEY, op))
  const allManagers = getSupportedManagers(environment)
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

// packages the group pulls in by name: another pack if one matches, otherwise a loose name
function groupExtras(content: unknown): Array<string> {
  const extras = (content as { extras?: unknown } | null)?.extras
  return Array.isArray(extras) ? extras.filter((e): e is string => typeof e === 'string') : []
}

// another name for the whole group, for lookup only — managers still install the names they declare
function groupAliases(content: unknown): Array<string> {
  const aliases = (content as { aliases?: unknown } | null)?.aliases
  return Array.isArray(aliases) ? aliases.filter((a): a is string => typeof a === 'string') : []
}

// a group is on offer here if this platform has a manager it names, or its script is gated in. the managers it names
// are only candidates: whether one is really on this machine is the client's to answer
function groupCandidates(
  // deno-lint-ignore no-explicit-any
  content: any,
  allManagers: Array<string> | null,
  context: Ctx | null,
): Array<string> | null {
  if (!allManagers || !context) {
    return []
  }
  const managerConfig = (groupOp(content, 'add')?.manager ?? {}) as Record<string, ManagerEntry>
  if (selectScriptEntry(managerConfig[SCRIPT_PATH] as unknown as Record<string, ScriptEntry>, context)) {
    return []
  }
  const candidates = Object.keys(managerConfig).filter((m) =>
    m !== SCRIPT_PATH && allManagers.includes(m) && evaluateGate(managerConfig[m]?.gate, context)
  )
  return candidates.length ? candidates : null
}

// matched on group name and aliases only: what a manager has is that manager's own search to answer
async function findGroups(
  filters: Array<string> | undefined,
  allManagers: Array<string> | null,
  context: Ctx | null,
): Promise<{ entries: Array<string>; found: Array<string> }> {
  const results = await getCfgDirDump([PACK_KEY], {
    extension: Fmt.yaml,
    flexible: true,
  })
  const entries: Array<string> = []
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
    const aliases = groupAliases(content).toSorted()
    if (filters?.length) {
      const matched = filters.filter((f) => name.includes(f) || aliases.some((a) => a.includes(f)))
      if (matched.length !== filters.length) {
        continue
      }
      for (const f of matched) {
        if (!found.includes(f)) {
          found.push(f)
        }
      }
    }
    const label = aliases.length ? `${name} (${aliases.join(', ')})` : name
    entries.push([label, ...candidates].join('|'))
  }
  return { entries: entries.toSorted(), found }
}

function printGroups(shell: Sh, entries: Array<string>) {
  const lines = entries.map((entry) => {
    const [label, ...candidates] = entry.split('|')
    return ['packFindGroup', shell.toLiteral(label), ...candidates.map((c) => shell.toLiteral(c))].join(' ')
  })
  return shell.with(shell.gatedFunc('use pack', lines))
}

function callManagers(shell: Sh, managers: Array<string>) {
  const seen = new Set<string>()
  const calls: Array<string> = []
  for (const m of managers) {
    const fn = getManagerCallName(m)
    if (!seen.has(fn)) {
      seen.add(fn)
      calls.push(fn)
    }
  }
  return shell.with(calls)
}

function setOpNames(shell: Sh, op: string, names: Array<string>) {
  return shell.with(
    shell.varSetArr(PACK_OP_NAMES_KEY(op), names),
  )
}

interface ManagerEntry {
  names: Array<string>
  gate?: Record<string, Array<string>>
  pwsh?: ScriptEntry
  zsh?: ScriptEntry
}

type RemManagerEntry = Record<string, ScriptEntry>

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
    const preScript = entry[nativeShell as 'pwsh' | 'zsh']
    if (preScript?.commands?.length) {
      lines.push(...buildCmdRunLines(shell, plat, nativeShell, preScript.commands))
    }
  }

  lines.push(shell.varSetArr(PACK_OP_NAMES_KEY(op), entry.names))
  lines.push(getManagerCallName(manager))

  if (op === 'remove') {
    const postScript = remEntry?.[nativeShell]
    if (postScript?.commands?.length) {
      lines.push(...buildCmdRunLines(shell, plat, nativeShell, postScript.commands))
    }
  }

  lines.push(shell.varUnSet(PACK_MANAGER_KEY))

  return lines
}

export type TierBlock = { label: string; pre?: Array<string>; lines: Array<string> }

export function buildTierChain(tiers: Array<TierBlock>): Array<string> {
  function buildChain(i: number): Array<string> {
    const { label, pre = [], lines } = tiers[i]
    const assign = i === 0 ? `mut yn = ''` : `$yn = ''`
    const prompt = [
      assign,
      `if 'YES' in $env {`,
      `  $yn = 'y'`,
      `} else {`,
      `  $yn = input r#'${label} [y,[n]]: '#`,
      `}`,
    ]
    if (i === tiers.length - 1) {
      return [...pre, ...prompt, `if ($yn | str lowercase) in ['', 'y', 'yes'] {`, ...lines, `}`]
    }
    return [
      ...pre,
      ...prompt,
      `if ($yn | str lowercase) in ['', 'y', 'yes'] {`,
      ...lines,
      `} else {`,
      ...buildChain(i + 1),
      `}`,
    ]
  }
  return ['do --env {', ...buildChain(0), '}']
}

function requestedIndex(requested: Array<string>, manager: string): number {
  const index = requested.indexOf(manager)
  return index < 0 ? requested.length : index
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
  requested: Array<string>,
  managerSpecified: boolean,
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
      if (op !== 'add' || (managerSpecified && !requested.includes(SCRIPT_PATH))) {
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
        ? buildCmdRunLines(shell, plat, shellFlavor, entry.commands)
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

  if (requested.length > 1) {
    paths.sort((a, b) => requestedIndex(requested, a.manager) - requestedIndex(requested, b.manager))
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
    if (nameParts.length <= parts.length) {
      const isPrefix = parts.slice(0, nameParts.length).every((p, i) => p === nameParts[i])
      const isSuffix = parts.slice(parts.length - nameParts.length).every((
        p,
        i,
      ) => p === nameParts[i])
      const isLastPart = parts[parts.length - 1] === name
      if (isPrefix || isSuffix || isLastPart) {
        matched.push(resolvedName)
        continue
      }
    }
    // an alias stands in for the whole group name, so it matches like a full name does
    if (groupAliases(await loadGroupConfig(parts)).includes(name)) {
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
  requested: Array<string>,
  managerSpecified: boolean,
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
        requested,
        managerSpecified,
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

  const { shell: _shell, allManagers } = await initOp(
    shell,
    context,
    environment,
    op,
  )
  let result = _shell

  const requested = getRequestedManagers(environment)
  const unknown = requested.filter((m) => m !== SCRIPT_PATH && !MANAGERS.includes(m))
  if (unknown.length) {
    result = result.with(result.printWarn(`manager not known: ${unknown.join(', ')}`))
  }
  if (requested.length && !allManagers.length && !requested.includes(SCRIPT_PATH)) {
    return buildAndLog(result, environment)
  }
  if (allManagers.length) {
    result = result.with(result.varSetArr(PACK_MANAGERS_KEY, allManagers))
  }
  // whether a named manager is actually here is the client's to report
  if (requested.length) {
    const named = requested.filter((m) => m !== SCRIPT_PATH && MANAGERS.includes(m))
    if (named.length) {
      result = result.with([['packRequireManager', ...named.map((m) => result.toLiteral(m))].join(' ')])
    }
  }

  if (op === 'tidy') {
    return buildAndLog(callManagers(result, allManagers), environment)
  }

  const names = environment.getSplit(PACK_OP_NAMES_KEY(op))
  const managerSpecified = !!environment.get(PACK_MANAGERS_KEY)
  let found: Array<string> = []

  if (op === 'find') {
    const hasContext = context.sys_os_plat || context.sys_os || requested.length
    const { entries: groupEntries, found: groupFilterFound } = await findGroups(
      names.length ? names : undefined,
      hasContext ? allManagers : null,
      hasContext ? context : null,
    )
    found = groupFilterFound
    result = printGroups(result, groupEntries)
  } else if (op === 'add' || op === 'remove') {
    const { units, arms, claimed } = await buildPlan(
      result,
      context,
      op,
      allManagers,
      names,
      requested,
      managerSpecified,
    )
    found = claimed

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
  }

  const remaining = names.filter((n) => !found.includes(n))

  if ((op === 'find' && names.length) || op === 'list' || op === 'outdated' || op === 'info') {
    result = setOpNames(result, op, names)
    result = callManagers(result, allManagers)
  } else if (remaining.length || !names.length) {
    if (remaining.length) {
      result = setOpNames(result, op, remaining)
    }
    result = callManagers(result, allManagers)
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
