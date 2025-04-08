import { getCfgFsDirPrint } from '../cfg'
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

async function getDirPartsAndFilters(
  context: Ctx,
  environment: Env,
  envPartsKey: string,
) {
  const dirParts = ['virt', context.sys?.host ?? '']
  const filters: Array<string> = []
  const virtPartsKey = toEnvKey('virt', envPartsKey, 'parts')
  if (virtPartsKey in environment) {
    filters.push(...environment[virtPartsKey].split(' '))
  }

  return { dirParts, filters }
}

async function workOp(context: Ctx, environment: Env, shell: Sh, op: string) {
  const virtKey = 'virt'
  const virtManagerKey = toEnvKey(virtKey, 'manager')
  const virtInstancesKey = toEnvKey(virtKey, 'instances')

  const manager = environment[virtManagerKey]
  let _shell = shell

  const { dirParts, filters } = await getDirPartsAndFilters(
    context,
    environment,
    op,
  )
  const relParts = await getCfgFsDirPrint(async () => dirParts, {
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
    if (manager && key !== manager) {
      continue
    }
    if (!manager) {
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
      .withFsFileLoad(async () => [virtKey, op])
    if (!manager) {
      _shell = _shell.withVarUnset(async () => virtManagerKey)
    }
  }

  return await _shell.build()
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
    const packContentsKey = toEnvKey('virt', 'find', 'contents')

    const { dirParts, filters } = await getDirPartsAndFilters(
      context,
      environment,
      'find',
    )
    return await shell
      .withPrint(
        async () =>
          await getCfgFsDirPrint(async () => dirParts, {
            content: !!environment[packContentsKey],
            filters: async () => filters,
            format: toFmt(environment[toEnvKey('format')]),
            name: true,
          }),
      )
      .build()
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
    return await shell.withFsFileLoad(async () => ['virt', 'tidy']).build()
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
