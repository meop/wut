import { getCfgFsFileLoad, getCfgFsFileDump } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import type { Sh } from '../sh'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.desc = 'package manager ops'
    this.aliases = ['p', 'pa', 'pac', 'package']
    this.options = [{ keys: ['-m', '--manager'], desc: 'package manager' }]
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

const osPlatToManagers = {
  linux: ['apt', 'dnf', 'yay', 'pacman'],
  darwin: ['brew'],
  winnt: ['scoop', 'winget'],
}

const osIdToManagers = {
  arch: ['yay', 'pacman'],
  centos: ['dnf'],
  debian: ['apt'],
}

const CFG_EXT = 'yaml'

const LOG_KEY = toEnvKey('log')

const PACK_KEY = 'pack'
const PACK_MANAGER_KEY = toEnvKey(PACK_KEY, 'manager')
const PACK_OP_NAMES_KEY = (op: string) => toEnvKey(PACK_KEY, op, 'names')
const PACK_OP_GROUPS_KEY = (op: string) => toEnvKey(PACK_KEY, op, 'groups')
const PACK_OP_GROUP_NAMES_KEY = (op: string) =>
  toEnvKey(PACK_KEY, op, 'group', 'names')

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const osPlat = context.sys_os_plat
  const osId = context.sys_os_id

  if (osPlat) {
    managers.push(...osPlatToManagers[osPlat])
  }
  if (osId) {
    managers = managers.filter(p => osIdToManagers[osId].includes(p))
  }
  if (environment[PACK_MANAGER_KEY]) {
    managers = managers.filter(p => p === environment[PACK_MANAGER_KEY])
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

async function workAddFindRem(
  context: Ctx,
  environment: Env,
  shell: Sh,
  op: string,
) {
  let _shell = shell
  const supportedManagers = getSupportedManagers(context, environment)
  for (const supportedManager of supportedManagers) {
    _shell = _shell
      .withFsFileLoad(async () => [PACK_KEY, supportedManager, op])
      .withFsFileLoad(async () => [PACK_KEY, supportedManager])
  }

  const requestedNames = environment[PACK_OP_NAMES_KEY(op)].split(' ')
  const foundNames: Array<string> = []

  if (environment[PACK_OP_GROUPS_KEY(op)]) {
    for (const name of requestedNames) {
      const content = await getCfgFsFileLoad(
        async () => [PACK_KEY, name],
        CFG_EXT,
      )

      if (!content) {
        continue
      }

      if (op === 'find') {
        _shell = _shell.withPrint(async () => [
          (
            await getCfgFsFileDump(async () => [PACK_KEY, name], CFG_EXT)
          ).pop() ?? '',
        ])
      } else {
        for (const key of Object.keys(content)) {
          if (!supportedManagers.includes(key)) {
            continue
          }
          const value = content[key]
          if (!value?.names?.length) {
            continue
          }
          if (supportedManagers.length > 1) {
            _shell = _shell.withVarSet(
              async () => PACK_MANAGER_KEY,
              async () => key,
            )
          }
          if (value[op]) {
            _shell = _shell.withVarArrSet(
              async () => PACK_OP_GROUP_NAMES_KEY(op),
              async () => value[op],
            )
          }
          _shell = _shell.withVarSet(
            async () => PACK_OP_NAMES_KEY(op),
            async () => value.names.join(' '),
          )
          _shell = _shell.with(async () => [getManagerFuncName(key)])
          if (value[op]) {
            _shell = _shell.withVarUnset(async () =>
              PACK_OP_GROUP_NAMES_KEY(op),
            )
          }
          if (supportedManagers.length > 1) {
            _shell = _shell.withVarUnset(async () => PACK_MANAGER_KEY)
          }
        }
      }
      foundNames.push(name)
    }
  }

  const remainingNames = requestedNames.filter(n => !foundNames.includes(n))

  if (remainingNames.length) {
    _shell = _shell
      .withVarSet(
        async () => PACK_OP_NAMES_KEY(op),
        async () => remainingNames.join(' '),
      )
      .with(async () => supportedManagers.map(m => getManagerFuncName(m)))
  }

  const body = await _shell.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

async function workListOutSyncTidy(
  context: Ctx,
  environment: Env,
  shell: Sh,
  op: string,
) {
  const supportedManagers = getSupportedManagers(context, environment)

  let _shell = shell
  for (const supportedManager of supportedManagers) {
    _shell = _shell
      .withFsFileLoad(async () => [PACK_KEY, supportedManager, op])
      .withFsFileLoad(async () => [PACK_KEY, supportedManager])
  }

  const body = await _shell
    .with(async () => supportedManagers.map(m => getManagerFuncName(m)))
    .build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.desc = 'add on local'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-g', '--groups'], desc: 'check groups' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workAddFindRem(context, environment, shell, this.name)
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from remote'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-g', '--groups'], desc: 'check groups' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workAddFindRem(context, environment, shell, this.name)
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list on local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, this.name)
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'out'
    this.desc = 'list out of sync on local'
    this.aliases = ['o', 'ou']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, this.name)
  }
}

export class PackCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.desc = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'uninstall']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-g', '--groups'], desc: 'check groups' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workAddFindRem(context, environment, shell, this.name)
  }
}

export class PackCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.desc = 'sync from remote'
    this.aliases = ['s', 'sy']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, this.name)
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.desc = 'tidy on local'
    this.aliases = ['t', 'ti']
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, this.name)
  }
}
