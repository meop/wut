import type { Cli } from '@meop/shire/cli'
import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env, SPLIT_VAL, toKey } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'

import { getCfgFsDirDump } from '../cfg.ts'

export class VirtCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'virt'
    this.description = 'virtual manager ops'
    this.aliases = ['v', 'vi', 'vir', 'virtual']
    this.options = [
      { keys: ['-m', '--manager'], description: 'manager to use' },
    ]
    this.commands = [
      new VirtCmdAdd([...this.scopes, this.name]),
      new VirtCmdFind([...this.scopes, this.name]),
      new VirtCmdList([...this.scopes, this.name]),
      new VirtCmdRem([...this.scopes, this.name]),
      new VirtCmdSync([...this.scopes, this.name]),
      new VirtCmdTidy([...this.scopes, this.name]),
    ]
  }
}

const osPlatToManager: { [key: string]: Array<string> } = {
  linux: ['docker', 'qemu'],
  darwin: ['docker'],
  winnt: ['docker'],
}

const VIRT_KEY = 'virt'
const VIRT_MANAGER_KEY = toKey(VIRT_KEY, 'manager')
const VIRT_OP_PARTS_KEY = (op: string) => toKey(VIRT_KEY, op, 'parts')

const VIRT_INSTANCES_KEY = toKey(VIRT_KEY, 'instances')

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const osPlat = context.sys_os_plat

  if (osPlat) {
    managers.push(...osPlatToManager[osPlat])
  }
  if (environment.get(VIRT_MANAGER_KEY)) {
    managers = managers.filter((p) => p === environment.get(VIRT_MANAGER_KEY))
  }

  return managers
}

function getManagerFuncName(manager: string, prefix = VIRT_KEY) {
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

async function workOp(client: Cli, context: Ctx, environment: Env, op: string) {
  if (client.name !== 'nu') {
    const url = [
      context.req_orig,
      context.req_path.replace(`/cli/${client.name}`, '/cli/nu'),
      context.req_srch,
    ].join('')
    return `nu --no-config-file -c 'nu --no-config-file -c $"( http get --raw --redirect-mode follow "${url}" )"'`
  }

  let _client = client
  const supportedManagers = getSupportedManagers(context, environment)

  const dirParts = [VIRT_KEY, context.sys_host ?? '']
  const filters = environment.get(VIRT_OP_PARTS_KEY(op))?.split(SPLIT_VAL) ?? []

  if (op === 'find') {
    _client = _client.with(
      _client.gatedFunc(
        'use cfg (remote)',
        _client.print(
          getCfgFsDirDump(Promise.resolve(dirParts), {
            extension: Fmt.yaml,
            filters: Promise.resolve(filters),
          }).then((x) =>
            x
              .filter((r) => supportedManagers.includes(r[0]))
              .map((r) => r.join(' '))
          ),
        ),
      ),
    )
  } else {
    for (const supportedManager of supportedManagers) {
      _client = _client
        .with(
          _client.fileLoad(Promise.resolve([VIRT_KEY, supportedManager, op])),
        )
        .with(_client.fileLoad(Promise.resolve([VIRT_KEY, supportedManager])))
    }
    const results = await getCfgFsDirDump(Promise.resolve(dirParts), {
      extension: Fmt.yaml,
      filters: Promise.resolve(filters),
    })

    const virtMap: { [key: string]: Array<string> } = {}

    for (const parts of results) {
      if (parts[0] in virtMap) {
        virtMap[parts[0]].push(parts[1])
      } else {
        virtMap[parts[0]] = [parts[1]]
      }
    }

    for (const key of Object.keys(virtMap)) {
      if (!supportedManagers.includes(key)) {
        continue
      }
      if (supportedManagers.length > 1) {
        _client = _client.with(
          _client.varSet(
            Promise.resolve(VIRT_MANAGER_KEY),
            Promise.resolve(_client.toInner(key)),
          ),
        )
      }
      _client = _client
        .with(
          _client.varArrSet(
            Promise.resolve(VIRT_INSTANCES_KEY),
            Promise.resolve(virtMap[key]),
          ),
        )
        .with(Promise.resolve([getManagerFuncName(key)]))
      if (supportedManagers.length > 1) {
        _client = _client.with(
          _client.varUnset(Promise.resolve(VIRT_MANAGER_KEY)),
        )
      }
    }
  }

  const body = await _client.build()

  if (environment.get('log')) {
    console.log(body)
  }

  return body
}

export class VirtCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.description = 'add on local'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [
      { name: 'parts', description: 'path part(s) to match', required: true },
    ]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class VirtCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class VirtCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.description = 'list on local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class VirtCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.description = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'unin', 'uninstall']
    this.arguments = [
      { name: 'parts', description: 'path part(s) to match', required: true },
    ]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class VirtCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.description = 'sync from remote'
    this.aliases = ['s', 'sy', 'up', 'update', 'upgrade']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class VirtCmdTidy extends CmdBase implements Cmd {
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
    return await workOp(client, context, environment, this.name)
  }
}
