import { getCfgFsFileLoad, getCfgFsFileDump } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import { toFmt } from '../serde'
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

const osPlatToPackManager = {
  linux: ['apt', 'apt-get', 'dnf', 'pacman', 'yay'],
  macos: ['brew'],
  windows: ['scoop', 'winget'],
}

const osIdToPackManager = {
  arch: ['pacman', 'yay'],
  archarm: ['pacman', 'yay'],
  debian: ['apt', 'apt-get'],
  raspbian: ['apt', 'apt-get'],
}

function getSupportedManagers(context: Ctx, manager?: string) {
  let managers: Array<string> = []

  const osPlat = context.sys?.os?.plat
  const osId = context.sys?.os?.id

  if (osPlat) {
    managers.push(...osPlatToPackManager[osPlat])
  }
  if (osId) {
    managers = managers.filter(p => osIdToPackManager[osId].includes(p))
  }
  if (manager) {
    managers = managers.filter(p => p === manager)
  }

  return managers
}

function getManagerFuncName(manager: string) {
  if (!manager) {
    return ''
  }
  const first = manager[0].toUpperCase()
  const rest = manager
    .slice(1)
    .replaceAll('-', '')
    .replaceAll('_', '')
    .toLowerCase()

  return `pack${first}${rest}`
}

async function workAddFindRem(
  context: Ctx,
  environment: Env,
  shell: Sh,
  op: string,
) {
  const packKey = 'pack'
  const packManagerKey = toEnvKey(packKey, 'manager')
  const packNamesKey = toEnvKey(packKey, op, 'names')
  const packContentsKey = toEnvKey(packKey, op, 'contents')
  const packGroupsKey = toEnvKey(packKey, op, 'groups')
  const packGroupNamesKey = toEnvKey(packKey, op, 'group', 'names')
  const cfgExt = 'yaml'

  let _shell = shell
  const supportedManagers = getSupportedManagers(
    context,
    environment[packManagerKey],
  )
  for (const supportedManager of supportedManagers) {
    _shell = _shell.withFsFileLoad(async () => [packKey, supportedManager])
  }

  const requestedNames = environment[packNamesKey].split(' ')
  const foundNames: Array<string> = []

  if (environment[packGroupsKey]) {
    for (const name of requestedNames) {
      const content = await getCfgFsFileLoad(
        async () => [packKey, name],
        cfgExt,
      )

      if (!content) {
        continue
      }

      if (op === 'find') {
        _shell = _shell.withPrint(
          async () =>
            await getCfgFsFileDump(async () => [packKey, name], cfgExt, {
              content: !!environment[packContentsKey],
              format: toFmt(environment[toEnvKey('format')]),
              name: true,
            }),
        )
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
              async () => packManagerKey,
              async () => key,
            )
          }
          if (value[op]) {
            _shell = _shell.withVarArrSet(
              async () => packGroupNamesKey,
              async () => value[op],
            )
          }
          _shell = _shell.withVarSet(
            async () => packNamesKey,
            async () => value.names.join(' '),
          )
          _shell = _shell.withVarSet(
            async () => toEnvKey(packKey, 'op'),
            async () => op,
          )
          _shell = _shell.with(async () => [getManagerFuncName(key)])
          if (value[op]) {
            _shell = _shell.withVarUnset(async () => packGroupNamesKey)
          }
          if (supportedManagers.length > 1) {
            _shell = _shell.withVarUnset(async () => packManagerKey)
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
        async () => packNamesKey,
        async () => remainingNames.join(' '),
      )
      .withVarSet(
        async () => toEnvKey(packKey, 'op'),
        async () => op,
      )
      .with(async () => supportedManagers.map(m => getManagerFuncName(m)))
  }

  const body = await _shell.build()

  if (environment[toEnvKey('log')]) {
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
  const supportedManagers = getSupportedManagers(
    context,
    environment[toEnvKey('pack', 'manager')],
  )

  let _shell = shell
  for (const supportedManager of supportedManagers) {
    _shell = _shell.withFsFileLoad(async () => ['pack', supportedManager])
  }

  const body = await _shell
    .withVarSet(
      async () => toEnvKey('pack', 'op'),
      async () => op,
    )
    .with(async () => supportedManagers.map(m => getManagerFuncName(m)))
    .build()

  if (environment[toEnvKey('log')]) {
    console.log(body)
  }

  return body
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.desc = 'add from web'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-g', '--groups'], desc: 'check groups' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workAddFindRem(context, environment, shell, 'add')
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from web'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [
      { keys: ['-c', '--contents'], desc: 'print contents' },
      { keys: ['-g', '--groups'], desc: 'check groups' },
    ]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workAddFindRem(context, environment, shell, 'find')
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, 'list')
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'out'
    this.desc = 'list out of sync from local'
    this.aliases = ['o', 'ou']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, 'out')
  }
}

export class PackCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.desc = 'remove from local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'uninstall']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-g', '--groups'], desc: 'check groups' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workAddFindRem(context, environment, shell, 'rem')
  }
}

export class PackCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.desc = 'sync from web'
    this.aliases = ['s', 'sy']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, 'sync')
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.desc = 'tidy from local'
    this.aliases = ['t', 'ti']
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workListOutSyncTidy(context, environment, shell, 'tidy')
  }
}
