import { getCfgFsDirDump } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import { toFmt } from '../serde'
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
  macos: ['docker'],
  windows: ['docker'],
}

const formatKey = toEnvKey('format')
const logKey = toEnvKey('log')

const virt = 'virt'
const virtManagerKey = toEnvKey(virt, 'manager')
const virtOpPartsKey = (op: string) => toEnvKey(virt, op, 'parts')
const virtOpContentsKey = (op: string) => toEnvKey(virt, op, 'contents')

const virtOpKey = toEnvKey(virt, 'op')
const virtInstancesKey = toEnvKey(virt, 'instances')

async function getDirPartsAndFilters(
  context: Ctx,
  environment: Env,
  op: string,
) {
  const dirParts = [virt, context.sys?.host ?? '']
  const filters: Array<string> = []
  if (virtOpPartsKey(op) in environment) {
    filters.push(...environment[virtOpPartsKey(op)].split(' '))
  }

  return { dirParts, filters }
}

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const osPlat = context.sys?.os?.plat

  if (osPlat) {
    managers.push(...osPlatToManager[osPlat])
  }
  if (environment[virtManagerKey]) {
    managers = managers.filter(p => p === environment[virtManagerKey])
  }

  return managers
}

function getManagerFuncName(manager: string, prefix = virt) {
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
  for (const supportedManager of supportedManagers) {
    _shell = _shell.withFsFileLoad(async () => [virt, supportedManager])
  }

  const { dirParts, filters } = await getDirPartsAndFilters(
    context,
    environment,
    op,
  )
  const relParts = await getCfgFsDirDump(async () => dirParts, {
    filters: async () => filters,
    name: true,
  })

  const virtMap: { [key: string]: Array<string> } = {}

  for (const relPart of relParts) {
    const parts = relPart.split(' ')
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
        async () => virtManagerKey,
        async () => key,
      )
    }
    _shell = _shell
      .withVarArrSet(
        async () => virtInstancesKey,
        async () => virtMap[key],
      )
      .withVarSet(
        async () => virtOpKey,
        async () => op,
      )
      .with(async () => [getManagerFuncName(key)])
    if (supportedManagers.length > 1) {
      _shell = _shell.withVarUnset(async () => virtManagerKey)
    }
  }

  const body = await _shell.build()

  if (environment[logKey]) {
    console.log(body)
  }

  return body
}

export class VirtCmdDown extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'down'
    this.desc = 'down from local'
    this.aliases = ['d', 'do', 'down', 'stop']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, 'down')
  }
}

export class VirtCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from local'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
    this.switches = [{ keys: ['-c', '--contents'], desc: 'print contents' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const op = 'find'

    const supportedManagers = getSupportedManagers(context, environment)

    const { dirParts, filters } = await getDirPartsAndFilters(
      context,
      environment,
      op,
    )

    let _shell = shell
    for (const supportedManager of supportedManagers) {
      _shell = _shell.withPrint(
        async () =>
          await getCfgFsDirDump(async () => dirParts, {
            content: !!environment[virtOpContentsKey(op)],
            filters: async () => [supportedManager, ...filters],
            format: toFmt(environment[formatKey]),
            name: true,
          }),
      )
    }

    const body = await shell.build()

    console.log(JSON.stringify(environment, null, 2))

    if (environment[logKey]) {
      console.log(body)
    }

    return body
  }
}

export class VirtCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, 'list')
  }
}

export class VirtCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.desc = 'sync from web'
    this.aliases = ['s', 'sy']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, 'sync')
  }
}

export class VirtCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.desc = 'tidy from local'
    this.aliases = ['t', 'ti']
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, 'tidy')
  }
}

export class VirtCmdUp extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'up'
    this.desc = 'up from local'
    this.aliases = ['u', 'start']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, 'up')
  }
}
