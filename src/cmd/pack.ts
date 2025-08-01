import { getCfgFsFileDump, getCfgFsFileLoad } from '../cfg.ts'
import { Powershell } from '../cli/pwsh.ts'
import { Zshell } from '../cli/zsh.ts'
import type { Cli } from '../cli.ts'
import { type Cmd, CmdBase } from '../cmd.ts'
import type { Ctx } from '../ctx.ts'
import { type Env, toEnvKey } from '../env.ts'
import { Fmt } from '../serde.ts'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.description = 'package manager ops'
    this.aliases = ['p', 'pa', 'pac', 'package']
    this.options = [
      { keys: ['-m', '--manager'], description: 'package manager' },
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

const osPlatToManagers: { [key: string]: Array<string> } = {
  linux: ['apt', 'dnf', 'yay', 'pacman'],
  darwin: ['brew'],
  winnt: ['scoop', 'winget'],
}

const osIdToManagers: { [key: string]: Array<string> } = {
  arch: ['yay', 'pacman'],
  debian: ['apt'],
  ubuntu: ['apt'],
  rocky: ['dnf'],
  fedora: ['dnf'],
}

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
  client: Cli,
  context: Ctx,
  environment: Env,
  op: string,
) {
  let _client = client
  const supportedManagers = getSupportedManagers(context, environment)
  for (const supportedManager of supportedManagers) {
    _client = _client
      .withFsFileLoad(() => Promise.resolve([PACK_KEY, supportedManager, op]))
      .withFsFileLoad(() => Promise.resolve([PACK_KEY, supportedManager]))
  }

  const requestedNames = environment[PACK_OP_NAMES_KEY(op)].split(' ')
  const foundNames: Array<string> = []

  if (environment[PACK_OP_GROUPS_KEY(op)]) {
    for (const name of requestedNames) {
      const content = await getCfgFsFileLoad(
        () => Promise.resolve([PACK_KEY, name]),
        {
          extension: Fmt.yaml,
        },
      )

      if (content == null) {
        continue
      }

      if (op === 'find') {
        _client = _client.withPrint(async () => [
          (
            await getCfgFsFileDump(() => Promise.resolve([PACK_KEY, name]), {
              extension: Fmt.yaml,
            })
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
            _client = _client.withVarSet(
              () => Promise.resolve(PACK_MANAGER_KEY),
              () => Promise.resolve(_client.toInnerStr(key)),
            )
          }
          if (value[op]) {
            _client = _client.withVarArrSet(
              () => Promise.resolve(PACK_OP_GROUP_NAMES_KEY(op)),
              () =>
                Promise.resolve(
                  value[op].map((v: string) =>
                    _client.name === 'nu'
                      ? _client.toOuterStr(
                          context.sys_os_plat === 'winnt'
                            ? Powershell.execStr(_client.toInnerStr(v))
                            : Zshell.execStr(_client.toInnerStr(v)),
                        )
                      : _client.toInnerStr(v),
                  ),
                ),
            )
          }
          _client = _client.withVarSet(
            () => Promise.resolve(PACK_OP_NAMES_KEY(op)),
            () => Promise.resolve(_client.toInnerStr(value.names.join(' '))),
          )
          _client = _client.with(() =>
            Promise.resolve([getManagerFuncName(key)]),
          )
          if (value[op]) {
            _client = _client.withVarUnset(() =>
              Promise.resolve(PACK_OP_GROUP_NAMES_KEY(op)),
            )
          }
          if (supportedManagers.length > 1) {
            _client = _client.withVarUnset(() =>
              Promise.resolve(PACK_MANAGER_KEY),
            )
          }
        }
      }
      foundNames.push(name)
    }
  }

  const remainingNames = requestedNames.filter(n => !foundNames.includes(n))

  if (remainingNames.length) {
    _client = _client
      .withVarSet(
        () => Promise.resolve(PACK_OP_NAMES_KEY(op)),
        () => Promise.resolve(_client.toInnerStr(remainingNames.join(' '))),
      )
      .with(() =>
        Promise.resolve(supportedManagers.map(m => getManagerFuncName(m))),
      )
  }

  const body = await _client.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

async function workListOutSyncTidy(
  client: Cli,
  context: Ctx,
  environment: Env,
  op: string,
) {
  const supportedManagers = getSupportedManagers(context, environment)

  let _client = client
  for (const supportedManager of supportedManagers) {
    _client = _client
      .withFsFileLoad(() => Promise.resolve([PACK_KEY, supportedManager, op]))
      .withFsFileLoad(() => Promise.resolve([PACK_KEY, supportedManager]))
  }

  const body = await _client
    .with(() =>
      Promise.resolve(supportedManagers.map(m => getManagerFuncName(m))),
    )
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
    this.description = 'add on local'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', req: true },
    ]
    this.switches = [{ keys: ['-g', '--groups'], description: 'check groups' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workAddFindRem(client, context, environment, this.name)
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', req: true },
    ]
    this.switches = [{ keys: ['-g', '--groups'], description: 'check groups' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workAddFindRem(client, context, environment, this.name)
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
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workListOutSyncTidy(client, context, environment, this.name)
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
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workListOutSyncTidy(client, context, environment, this.name)
  }
}

export class PackCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.description = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'unin', 'uninstall']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', req: true },
    ]
    this.switches = [{ keys: ['-g', '--groups'], description: 'check groups' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workAddFindRem(client, context, environment, this.name)
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
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workListOutSyncTidy(client, context, environment, this.name)
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
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workListOutSyncTidy(client, context, environment, this.name)
  }
}
