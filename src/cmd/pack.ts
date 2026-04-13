import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileContent, getCfgFileLoad } from '../cfg.ts'
import { execNativeShell, redirectCommonShell } from '../sh.ts'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.description = 'package manager ops'
    this.aliases = ['p', 'pa', 'pac', 'package']
    this.options = [
      { keys: ['-m', '--manager'], description: 'manager to use' },
    ]
    this.commands = [
      new PackCmdAdd([...this.scopes, this.name]),
      new PackCmdFind([...this.scopes, this.name]),
      new PackCmdList([...this.scopes, this.name]),
      new PackCmdOut([...this.scopes, this.name]),
      new PackCmdRem([...this.scopes, this.name]),
      new PackCmdSync([...this.scopes, this.name]),
      new PackCmdTidy([...this.scopes, this.name]),
    ]
  }
}

// System managers (OS-level, including AUR wrappers)
const sysOsPlatToSysManagers: Record<string, Array<string>> = {
  darwin: ['brew'],
  linux: ['apk', 'apt', 'dnf', 'pacman', 'paru', 'yay', 'xbps', 'zypper'],
  winnt: ['choco', 'scoop', 'winget'],
}

const sysOsToSysManagers: Record<string, Array<string>> = {
  alma: ['dnf'],
  alpine: ['apk'],
  arch: ['pacman', 'paru', 'yay'],
  centos: ['dnf'],
  debian: ['apt'],
  fedora: ['dnf'],
  kali: ['apt'],
  manjaro: ['pacman', 'paru', 'yay'],
  mint: ['apt'],
  rhel: ['dnf'],
  rocky: ['dnf'],
  suse: ['zypper'],
  ubuntu: ['apt'],
  void: ['xbps'],
}

// User managers (language-native: cargo, npx, bunx, pipx, uvx…)
const sysOsPlatToUserManagers: Record<string, Array<string>> = {
  darwin: ['cargo'],
  linux: ['cargo'],
  winnt: ['cargo'],
}

const sysOsToUserManagers: Record<string, Array<string>> = {}

const PACK_KEY = 'pack'
const PACK_MANAGER_KEY = [PACK_KEY, 'manager']
const PACK_OP_KEY = [PACK_KEY, 'op']
const PACK_OP_NAMES_KEY = (op: string) => [PACK_KEY, op, 'names']

export function getSupportedManagers(
  platMap: Record<string, Array<string>>,
  osMap: Record<string, Array<string>>,
  context: Ctx,
  environment: Env,
): Array<string> {
  let managers: Array<string> = []
  if (context.sys_os_plat) {
    managers.push(...(platMap[context.sys_os_plat] ?? []))
  }
  if (context.sys_os) {
    const match = Object.keys(osMap)
      .filter((key) => context.sys_os!.includes(key))
      .sort((a, b) => b.length - a.length)[0]
    if (match) {
      managers = osMap[match].filter((p) => managers.includes(p))
    }
  }
  if (environment.get(PACK_MANAGER_KEY)) {
    managers = managers.filter((p) => p === environment.get(PACK_MANAGER_KEY))
  }
  return managers
}

function getSupportedSysManagers(context: Ctx, environment: Env) {
  return getSupportedManagers(
    sysOsPlatToSysManagers,
    sysOsToSysManagers,
    context,
    environment,
  )
}

function getSupportedUserManagers(context: Ctx, environment: Env) {
  return getSupportedManagers(
    sysOsPlatToUserManagers,
    sysOsToUserManagers,
    context,
    environment,
  )
}

function getNativeShellForPlat(plat: string): string {
  return plat === 'winnt' ? 'pwsh' : 'zsh'
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

const managerOpDeps: Record<string, string> = {
  paru: 'pacman',
  yay: 'pacman',
}

function getManagerFuncName(manager: string, prefix = PACK_KEY) {
  return manager
    ? `${prefix}${manager[0].toUpperCase()}${manager.slice(1).replaceAll('-', '').replaceAll('_', '').toLowerCase()}`
    : ''
}

function buildCmdRunLines(
  shell: Sh,
  plat: string,
  commands: Array<string>,
): Array<string> {
  return [
    ...commands.flatMap((cmd) => shell.print(`  ${cmd}`)),
    `if 'NOOP' not-in $env { ${execNativeShell(shell, plat, commands.join('\n'))} }`,
  ]
}

async function buildFileRunLines(
  shell: Sh,
  plat: string,
  filePath: string,
): Promise<Array<string> | null> {
  const { parts, ext } = parseScriptFilePath(filePath)
  const fileContent = await getCfgFileContent(parts, { extension: ext })
  if (!fileContent) {
    return null
  }
  return [
    ...shell.print(`  ${filePath}`),
    `if 'NOOP' not-in $env { ${execNativeShell(shell, plat, fileContent)} }`,
  ]
}

async function loadManagerFiles(
  shell: Sh,
  managers: Array<string>,
  op: string,
) {
  let _shell = shell
  for (const manager of managers) {
    const dep = managerOpDeps[manager]
    if (dep && !managers.includes(dep)) {
      _shell = _shell
        .with(
          await _shell.fileLoad(
            [PACK_KEY, dep, op],
            import.meta.resolve,
            ['..'],
          ),
        )
    }
    _shell = _shell
      .with(
        await _shell.fileLoad(
          [PACK_KEY, manager, op],
          import.meta.resolve,
          ['..'],
        ),
      )
      .with(
        await _shell.fileLoad(
          [PACK_KEY, manager],
          import.meta.resolve,
          ['..'],
        ),
      )
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
    userManagers: Array<string>
    sysManagers: Array<string>
  }
> {
  let _shell = shell.with(shell.varSetStr(PACK_OP_KEY, op))
  const sysManagers = getSupportedSysManagers(context, environment)
  const userManagers = getSupportedUserManagers(context, environment)
  const allManagers = [...userManagers, ...sysManagers]
  _shell = await loadManagerFiles(_shell, allManagers, op)
  return { shell: _shell, allManagers, userManagers, sysManagers }
}

async function loadGroupConfig(parts: Array<string>) {
  return await getCfgFileLoad([PACK_KEY, ...parts], { extension: Fmt.yaml })
}

async function findGroupsWithNames(
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
    const allNames: Array<string> = []

    const addConfig = content.add as Record<string, unknown> | undefined

    if (addConfig) {
      let tierFound = false
      for (const tier of Object.keys(addConfig)) {
        if (tier === 'script') {
          if (!context) {
            continue
          }
          const nativeShell = getNativeShellForPlat(context.sys_os_plat ?? '')
          const scriptConfig = addConfig[tier] as
            | Record<string, ScriptEntry>
            | undefined
          const entry = scriptConfig?.[nativeShell]
          if (!entry || !evaluateGate(entry.gate, context)) {
            continue
          }
          if (entry.commands?.length) {
            for (const cmd of entry.commands) {
              if (!allNames.includes(cmd)) {
                allNames.push(cmd)
              }
            }
            tierFound = true
          } else if (entry.file) {
            if (!allNames.includes(entry.file)) {
              allNames.push(entry.file)
            }
            tierFound = true
          }
        } else {
          const tierContent = addConfig[tier] as
            | Record<string, ManagerEntry>
            | undefined
          if (!tierContent) {
            continue
          }
          for (const key of Object.keys(tierContent)) {
            if (allManagers?.length && !allManagers.includes(key)) {
              continue
            }
            for (const n of tierContent[key]?.names ?? []) {
              if (!allNames.includes(n)) {
                allNames.push(n)
                tierFound = true
              }
            }
          }
        }
        if (tierFound && context) {
          break
        }
      }
    }

    if (!allNames.length) {
      continue
    }
    if (filters?.length) {
      const matchedFilters = filters.filter((f) => name.includes(f) || allNames.some((n) => n.includes(f)))
      if (matchedFilters.length !== filters.length) {
        continue
      }
      for (const f of matchedFilters) {
        if (!found.includes(f)) {
          found.push(f)
        }
      }
    }
    entries.push(`${name}|${allNames.join(', ')}`)
  }
  return { entries: entries.toSorted(), found }
}

function printGroups(shell: Sh, entries: Array<string>) {
  const lines: Array<string> = []
  for (const entry of entries) {
    const sep = entry.indexOf('|')
    const key = sep >= 0 ? entry.slice(0, sep) : entry
    const names = sep >= 0 ? entry.slice(sep + 1) : ''
    lines.push(...shell.print(key))
    if (names) {
      lines.push(...shell.print(`  ${names}`))
    }
  }
  return shell.with(shell.gatedFunc('use pack', lines))
}

function callManagers(shell: Sh, managers: Array<string>) {
  return shell.with(managers.map((m) => getManagerFuncName(m)))
}

function setOpNames(shell: Sh, op: string, names: string) {
  return shell.with(
    shell.varSetStr(PACK_OP_NAMES_KEY(op), names),
  )
}

interface ManagerEntry {
  names: Array<string>
}

type RemManagerEntry = Record<string, ScriptEntry>

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

  if (op === 'add') {
    const preScript = (entry as unknown as Record<string, ScriptEntry>)[nativeShell]
    if (preScript?.commands?.length) {
      lines.push(...buildCmdRunLines(shell, plat, preScript.commands))
    }
  }

  lines.push(shell.varSetStr(PACK_OP_NAMES_KEY(op), entry.names.join(' ')))
  lines.push(getManagerFuncName(manager))

  if (op === 'rem') {
    const postScript = remEntry?.[nativeShell]
    if (postScript?.commands?.length) {
      lines.push(...buildCmdRunLines(shell, plat, postScript.commands))
    }
  }

  lines.push(shell.varUnSet(PACK_MANAGER_KEY))
  if (op === 'add' || op === 'rem') {
    lines.push('$env.PACKED = true')
  }

  return lines
}

export type TierBlock = { label: string; lines: Array<string> }

export function buildTierChain(tiers: Array<TierBlock>): Array<string> {
  function buildChain(i: number): Array<string> {
    const { label, lines } = tiers[i]
    const assign = i === 0 ? `mut yn = ''` : `$yn = ''`
    const prompt = [
      assign,
      `if 'YES' in $env {`,
      `  $yn = 'y'`,
      `} else {`,
      `  $yn = input r#'? ${label} [y, [n]]: '#`,
      `}`,
    ]
    if (i === tiers.length - 1) {
      return [...prompt, `if $yn != 'n' {`, ...lines, `}`]
    }
    return [
      ...prompt,
      `if $yn != 'n' {`,
      ...lines,
      `} else {`,
      ...buildChain(i + 1),
      `}`,
    ]
  }
  return ['do --env {', ...buildChain(0), '}']
}

async function processGroupConfig(
  shell: Sh,
  context: Ctx,
  op: string,
  userManagers: Array<string>,
  sysManagers: Array<string>,
  name: string,
): Promise<{ shell: Sh; found: boolean }> {
  const content = await loadGroupConfig(name.split('-'))
  if (content == null) {
    return { shell, found: false }
  }

  const addConfig = content.add as Record<string, unknown> | undefined
  const remConfig = content.rem as {
    system?: Record<string, RemManagerEntry>
    user?: Record<string, RemManagerEntry>
  } | undefined

  let _shell = shell
  let found = false
  const plat = context.sys_os_plat ?? ''
  const tierBlocks: Array<TierBlock> = []

  for (const tier of Object.keys(addConfig ?? {})) {
    if (tier === 'script') {
      if (op !== 'add') {
        continue
      }
      const nativeShell = getNativeShellForPlat(plat)
      const scriptConfig = addConfig![tier] as
        | Record<string, ScriptEntry>
        | undefined
      const entry = scriptConfig?.[nativeShell]
      if (!entry || !evaluateGate(entry.gate, context)) {
        continue
      }
      const scriptLines: Array<string> = [..._shell.print(name)]
      if (entry.commands?.length) {
        scriptLines.push(...buildCmdRunLines(_shell, plat, entry.commands))
        tierBlocks.push({ label: 'use pack (script)', lines: scriptLines })
        found = true
      } else if (entry.file) {
        const fileLines = await buildFileRunLines(_shell, plat, entry.file)
        if (fileLines) {
          scriptLines.push(...fileLines)
          tierBlocks.push({ label: 'use pack (script)', lines: scriptLines })
          found = true
        }
      }
    } else if (tier === 'user') {
      const userConfig = addConfig![tier] as
        | Record<string, ManagerEntry>
        | undefined
      for (const tool of userManagers) {
        const entry = userConfig?.[tool]
        if (!entry?.names?.length) {
          continue
        }
        tierBlocks.push({
          label: 'use pack (user)',
          lines: [
            ..._shell.print(name),
            ..._shell.print(`  ${entry.names.join(', ')}`),
            ...processManagerEntryLines(
              _shell,
              context,
              op,
              tool,
              entry,
              remConfig?.user?.[tool],
            ),
          ],
        })
        found = true
      }
    } else if (tier === 'system') {
      const systemConfig = addConfig![tier] as
        | Record<string, ManagerEntry>
        | undefined
      for (const key of Object.keys(systemConfig ?? {})) {
        if (!sysManagers.includes(key)) {
          continue
        }
        const entry = systemConfig![key]
        if (!entry?.names?.length) {
          continue
        }
        tierBlocks.push({
          label: 'use pack (system)',
          lines: [
            ..._shell.print(name),
            ..._shell.print(`  ${entry.names.join(', ')}`),
            ...processManagerEntryLines(
              _shell,
              context,
              op,
              key,
              entry,
              remConfig?.system?.[key],
            ),
          ],
        })
        found = true
      }
    }
  }

  if (tierBlocks.length === 1) {
    _shell = _shell.with(
      _shell.gatedFunc(tierBlocks[0].label, tierBlocks[0].lines),
    )
  } else if (tierBlocks.length > 1) {
    _shell = _shell.with(buildTierChain(tierBlocks))
  }

  return { shell: _shell, found }
}

async function resolveGroupName(name: string): Promise<Array<string>> {
  const nameParts = name.split('-')
  const results = await getCfgDirDump([PACK_KEY], {
    extension: Fmt.yaml,
    flexible: true,
  })
  const matched: Array<string> = []
  for (const parts of results) {
    if (nameParts.length > parts.length) {
      continue
    }
    const resolvedName = parts.join('-')
    if (matched.includes(resolvedName)) {
      continue
    }
    const isPrefix = parts.slice(0, nameParts.length).every((p, i) => p === nameParts[i])
    const isSuffix = parts.slice(parts.length - nameParts.length).every((
      p,
      i,
    ) => p === nameParts[i])
    if (isPrefix || isSuffix) {
      matched.push(resolvedName)
    }
  }
  return matched
}

async function processGroupNames(
  shell: Sh,
  context: Ctx,
  op: string,
  userManagers: Array<string>,
  sysManagers: Array<string>,
  names: Array<string>,
): Promise<{ shell: Sh; found: Array<string> }> {
  let _shell = shell
  const found: Array<string> = []

  for (const name of names) {
    const resolved = await resolveGroupName(name)
    for (const resolvedName of resolved) {
      const result = await processGroupConfig(
        _shell,
        context,
        op,
        userManagers,
        sysManagers,
        resolvedName,
      )
      _shell = result.shell
      if (result.found && !found.includes(name)) {
        found.push(name)
      }
    }
  }

  return { shell: _shell, found }
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

  const { shell: _shell, allManagers, userManagers, sysManagers } = await initOp(
    shell,
    context,
    environment,
    op,
  )
  let result = _shell

  if (op === 'tidy') {
    return buildAndLog(callManagers(result, allManagers), environment)
  }

  const names = environment.getSplit(PACK_OP_NAMES_KEY(op))
  let found: Array<string> = []

  if (op === 'find') {
    const hasContext = context.sys_os_plat || context.sys_os ||
      environment.get(PACK_MANAGER_KEY)
    const { entries: groupEntries, found: groupFilterFound } = await findGroupsWithNames(
      names.length ? names : undefined,
      hasContext ? allManagers : null,
      hasContext ? context : null,
    )
    found = groupFilterFound
    result = printGroups(result, groupEntries)
  } else if (op === 'add' || op === 'rem') {
    const groupResult = await processGroupNames(
      result,
      context,
      op,
      userManagers,
      sysManagers,
      names,
    )
    result = groupResult.shell
    found = groupResult.found
  }

  const remaining = names.filter((n) => !found.includes(n))

  if ((op === 'find' && names.length) || op === 'list' || op === 'out') {
    result = setOpNames(result, op, names.join(' '))
    result = callManagers(result, allManagers)
  } else if (op !== 'find') {
    const managerNames = remaining.length ? remaining : names
    if (managerNames.length) {
      result = setOpNames(result, op, managerNames.join(' '))
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

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'out'
    this.description = 'list out of sync on local'
    this.aliases = ['o', 'ou']
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

export class PackCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.description = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'unin', 'uninstall']
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
    this.aliases = ['s', 'sy', 'up', 'update', 'upgrade']
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
