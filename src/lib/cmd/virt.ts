import { getCfgFsDirDump } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import type { Sh } from '../sh'

export class VirtCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'virt'
    this.desc = 'virtual manager ops'
    this.aliases = ['v', 'vi', 'vir', 'virtual']
    this.options = [{ keys: ['-m', '--manager'], desc: 'virtual manager' }]
    this.commands = [
      new VirtCmdDown([...this.scopes, this.name]),
      new VirtCmdFind([...this.scopes, this.name]),
      new VirtCmdList([...this.scopes, this.name]),
      new VirtCmdSync([...this.scopes, this.name]),
      new VirtCmdTidy([...this.scopes, this.name]),
      new VirtCmdUp([...this.scopes, this.name]),
    ]
  }
}

const osPlatToManager = {
  linux: ['docker', 'qemu'],
  darwin: ['docker'],
  winnt: ['docker'],
}

const LOG_KEY = toEnvKey('log')

const VIRT_KEY = 'virt'
const VIRT_MANAGER_KEY = toEnvKey(VIRT_KEY, 'manager')
const VIRT_OP_PARTS_KEY = (op: string) => toEnvKey(VIRT_KEY, op, 'parts')

const VIRT_INSTANCES_KEY = toEnvKey(VIRT_KEY, 'instances')

async function getDirPartsAndFilters(
  context: Ctx,
  environment: Env,
  op: string,
) {
  const dirParts = [VIRT_KEY, context.sys_host ?? '']
  const filters: Array<string> = []
  if (VIRT_OP_PARTS_KEY(op) in environment) {
    filters.push(...environment[VIRT_OP_PARTS_KEY(op)].split(' '))
  }

  return { dirParts, filters }
}

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const osPlat = context.sys_os_plat

  if (osPlat) {
    managers.push(...osPlatToManager[osPlat])
  }
  if (environment[VIRT_MANAGER_KEY]) {
    managers = managers.filter(p => p === environment[VIRT_MANAGER_KEY])
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

async function workOp(context: Ctx, environment: Env, shell: Sh, op: string) {
  let _shell = shell
  const supportedManagers = getSupportedManagers(context, environment)
  const { dirParts, filters } = await getDirPartsAndFilters(
    context,
    environment,
    op,
  )

  if (op === 'find') {
    _shell = _shell.withPrint(async () =>
      (
        await getCfgFsDirDump(async () => dirParts, {
          filters: async () => filters,
        })
      )
        .filter(r => supportedManagers.includes(r[0]))
        .map(r => r.join(' ')),
    )
  } else {
    for (const supportedManager of supportedManagers) {
      _shell = _shell
        .withFsFileLoad(async () => [VIRT_KEY, supportedManager, op])
        .withFsFileLoad(async () => [VIRT_KEY, supportedManager])
    }
    const results = await getCfgFsDirDump(async () => dirParts, {
      filters: async () => filters,
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
        _shell = _shell.withVarSet(
          async () => VIRT_MANAGER_KEY,
          async () => key,
        )
      }
      _shell = _shell
        .withVarArrSet(
          async () => VIRT_INSTANCES_KEY,
          async () => virtMap[key],
        )
        .with(async () => [getManagerFuncName(key)])
      if (supportedManagers.length > 1) {
        _shell = _shell.withVarUnset(async () => VIRT_MANAGER_KEY)
      }
    }
  }

  const body = await _shell.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

export class VirtCmdDown extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'down'
    this.desc = 'down on local'
    this.aliases = ['d', 'do', 'down', 'stop']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}

export class VirtCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from remote'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}

export class VirtCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list on local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}

export class VirtCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.desc = 'sync from remote'
    this.aliases = ['s', 'sy']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}

export class VirtCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.desc = 'tidy on local'
    this.aliases = ['t', 'ti']
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}

export class VirtCmdUp extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'up'
    this.desc = 'up on local'
    this.aliases = ['u', 'start']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}
