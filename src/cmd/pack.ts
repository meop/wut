import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
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

const osPlatToManagers: Record<string, Array<string>> = {
  linux: ['yay', 'pacman', 'apt', 'dnf', 'zypper'],
  darwin: ['brew'],
  winnt: ['choco', 'scoop', 'winget'],
}

const osIdToManagers: Record<string, Array<string>> = {
  arch: ['yay', 'pacman'],
  archarm: ['yay', 'pacman'],
  manjaro: ['yay', 'pacman'],
  debian: ['apt'],
  linuxmint: ['apt'],
  ubuntu: ['apt'],
  fedora: ['dnf'],
  centos: ['dnf'],
  'centos-stream': ['dnf'],
  rocky: ['dnf'],
  rhel: ['dnf'],
  opensuse: ['zypper'],
  'opensuse-tumbleweed': ['zypper'],
  suse: ['zypper'],
}

const PACK_KEY = 'pack'
const PACK_MANAGER_KEY = [PACK_KEY, 'manager']
const PACK_OP_KEY = [PACK_KEY, 'op']
const PACK_OP_NAMES_KEY = (op: string) => [PACK_KEY, op, 'names']
const PACK_OP_GROUP_KEY = (op: string) => [PACK_KEY, op, 'group']
const PACK_OP_GROUP_NAMES_KEY = (
  op: string,
) => [PACK_KEY, op, 'group', 'names']

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const osPlat = context.sys_os_plat
  const osId = context.sys_os_id

  if (osPlat) {
    managers.push(...(osPlatToManagers[osPlat] ?? []))
  }
  if (osId && osId in osIdToManagers) {
    managers = managers.filter((p) => osIdToManagers[osId].includes(p))
  }
  if (environment.get(PACK_MANAGER_KEY)) {
    managers = managers.filter((p) => p === environment.get(PACK_MANAGER_KEY))
  }

  return managers
}

function getManagerFuncName(manager: string, prefix = PACK_KEY) {
  if (!manager) {
    return ''
  }
  const first = manager[0].toUpperCase()
  const rest = manager
    .slice(1)
    .replaceAll('-', '')
    .replaceAll('_', '')
    .toLowerCase()

  return `${prefix}${first}${rest}`
}

async function loadManagerFiles(
  shell: Sh,
  supportedManagers: Array<string>,
  op: string,
) {
  let _shell = shell
  for (const supportedManager of supportedManagers) {
    _shell = _shell
      .with(
        await _shell.fileLoad(
          [PACK_KEY, supportedManager, op],
          import.meta.resolve,
          ['..'],
        ),
      )
      .with(
        await _shell.fileLoad(
          [PACK_KEY, supportedManager],
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
): Promise<{ shell: Sh; managers: Array<string> }> {
  let _shell = shell.with(shell.varSetStr(PACK_OP_KEY, op))
  const managers = getSupportedManagers(context, environment)
  _shell = await loadManagerFiles(_shell, managers, op)
  return { shell: _shell, managers }
}

async function loadGroupConfig(name: string) {
  return await getCfgFileLoad([PACK_KEY, name], { extension: Fmt.yaml })
}

async function findGroupsWithNames(
  filters: Array<string> | undefined,
  managers: Array<string>,
): Promise<{ entries: Array<string>; found: Array<string> }> {
  const results = await getCfgDirDump([PACK_KEY], {
    extension: Fmt.yaml,
    flexible: true,
  })
  const entries: Array<string> = []
  const found: Array<string> = []
  for (const r of results) {
    const name = r.join(' ')
    const content = await loadGroupConfig(name)
    if (content == null) continue
    const allNames: Array<string> = []
    for (const key of Object.keys(content)) {
      if (managers.length && !managers.includes(key)) continue
      for (const n of (content[key] as ManagerEntry)?.names ?? []) {
        if (!allNames.includes(n)) allNames.push(n)
      }
    }
    if (filters?.length) {
      const matchedFilters = filters.filter((f) => name.includes(f) || allNames.some((n) => n.includes(f)))
      if (!matchedFilters.length) continue
      for (const f of matchedFilters) {
        if (!found.includes(f)) found.push(f)
      }
    }
    entries.push(allNames.length ? `${name}|${allNames.join(', ')}` : name)
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
    if (names) lines.push(...shell.print(`  ${names}`))
  }
  return shell.with(shell.gatedFunc('use config (remote)', lines))
}

function callManagers(shell: Sh, managers: Array<string>) {
  return shell.with(managers.map((m) => getManagerFuncName(m)))
}

function setOpNames(shell: Sh, op: string, names: string) {
  return shell.with(
    shell.varSetStr(PACK_OP_NAMES_KEY(op), names),
  )
}

function setOpGroupNames(
  shell: Sh,
  context: Ctx,
  op: string,
  values: Array<string>,
) {
  return shell.with(
    shell.varSetArr(
      PACK_OP_GROUP_NAMES_KEY(op),
      values.map((v: string) => execNativeShell(shell, context.sys_os_plat ?? '', v)),
    ),
  )
}

function unsetOpGroupNames(shell: Sh, op: string) {
  return shell.with(shell.varUnSet(PACK_OP_GROUP_NAMES_KEY(op)))
}

function setManager(shell: Sh, manager: string) {
  return shell.with(
    shell.varSetStr(PACK_MANAGER_KEY, manager),
  )
}

function unsetManager(shell: Sh) {
  return shell.with(shell.varUnSet(PACK_MANAGER_KEY))
}

interface ManagerEntry {
  names: Array<string>
  [op: string]: Array<string> | undefined
}

function processManagerEntry(
  shell: Sh,
  context: Ctx,
  op: string,
  manager: string,
  entry: ManagerEntry,
  multiManager: boolean,
): Sh {
  let _shell = shell

  if (multiManager) {
    _shell = setManager(_shell, manager)
  }

  if (entry[op]) {
    _shell = setOpGroupNames(_shell, context, op, entry[op] as Array<string>)
  }

  _shell = setOpNames(_shell, op, entry.names.join(' '))
  _shell = _shell.with([getManagerFuncName(manager)])

  if (entry[op]) {
    _shell = unsetOpGroupNames(_shell, op)
  }

  if (multiManager) {
    _shell = unsetManager(_shell)
  }

  return _shell
}

async function processGroupConfig(
  shell: Sh,
  context: Ctx,
  op: string,
  managers: Array<string>,
  name: string,
): Promise<{ shell: Sh; found: boolean }> {
  const content = await loadGroupConfig(name)
  if (content == null) {
    return { shell, found: false }
  }

  let _shell = shell
  const multiManager = managers.length > 1

  for (const key of Object.keys(content)) {
    if (!managers.includes(key)) {
      continue
    }
    const entry = content[key] as ManagerEntry
    if (!entry?.names?.length) {
      continue
    }
    _shell = processManagerEntry(
      _shell,
      context,
      op,
      key,
      entry,
      multiManager,
    )
  }

  return { shell: _shell, found: true }
}

async function processGroupNames(
  shell: Sh,
  context: Ctx,
  op: string,
  managers: Array<string>,
  names: Array<string>,
): Promise<{ shell: Sh; found: Array<string> }> {
  let _shell = shell
  const found: Array<string> = []

  for (const name of names) {
    const result = await processGroupConfig(
      _shell,
      context,
      op,
      managers,
      name,
    )
    _shell = result.shell
    if (result.found) {
      found.push(name)
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

  const { shell: _shell, managers } = await initOp(
    shell,
    context,
    environment,
    op,
  )
  let result = _shell

  if (op === 'tidy') {
    return buildAndLog(callManagers(result, managers), environment)
  }

  const names = environment.getSplit(PACK_OP_NAMES_KEY(op))
  let found: Array<string> = []
  let groupFound = false

  if (environment.get(PACK_OP_GROUP_KEY(op))) {
    if (op === 'find') {
      const { entries: groupEntries, found: groupFilterFound } = await findGroupsWithNames(
        names.length ? names : undefined,
        managers,
      )
      found = groupFilterFound
      result = printGroups(result, groupEntries)
      groupFound = groupEntries.length > 0
    } else {
      const groupResult = await processGroupNames(
        result,
        context,
        op,
        managers,
        names,
      )
      result = groupResult.shell
      found = groupResult.found
    }
  }

  const remaining = names.filter((n) => !found.includes(n))

  if (op === 'find' || op === 'list' || op === 'out') {
    for (const name of remaining) {
      result = setOpNames(result, op, name)
      result = callManagers(result, managers)
    }
    if (names.length === 0 && !groupFound) {
      result = setOpNames(result, op, '')
      result = callManagers(result, managers)
    }
  } else {
    if (remaining.length) {
      result = setOpNames(result, op, remaining.join(' '))
    }
    if (remaining.length || names.length === 0) {
      result = callManagers(result, managers)
    }
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
    this.switches = [{
      keys: ['-g', '--group'],
      description: 'group search will be used',
    }]
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
    this.switches = [{
      keys: ['-g', '--group'],
      description: 'group search will be used',
    }]
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
    this.switches = [{
      keys: ['-g', '--group'],
      description: 'group search will be used',
    }]
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
