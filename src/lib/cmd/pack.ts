import { getCfgFsFileLoad } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import { toCon, toFmt } from '../serde'
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

async function workOp(context: Ctx, environment: Env, shell: Sh, op: string) {
  const packKey = 'pack'
  const packManagerKey = toEnvKey(packKey, 'manager')
  const packNamesKey = toEnvKey(packKey, op, 'names')
  const packContentsKey = toEnvKey(packKey, op, 'contents')
  const packGroupsKey = toEnvKey(packKey, op, 'groups')

  const manager = environment[packManagerKey]
  let _shell = shell

  const requestedNames = environment[packNamesKey].split(' ')
  const foundNames: Array<string> = []

  if (environment[packGroupsKey]) {
    _shell = _shell.withVarUnset(async () => packGroupsKey)

    for (const name of requestedNames) {
      const contents = await getCfgFsFileLoad(
        async () => [packKey, name],
        'yaml',
      )
      if (!contents.length) {
        continue
      }

      if (op === 'find') {
        _shell = _shell.withPrint(async () => [name])
        if (environment[packContentsKey]) {
          _shell = _shell.withPrint(async () => [
            toCon(contents, toFmt(environment[toEnvKey('format')])),
          ])
        }
      } else {
        for (const key of Object.keys(contents)) {
          if (manager && key !== manager) {
            continue
          }
          const value = contents[key]
          if (!value?.names?.length) {
            continue
          }

          if (!manager) {
            _shell = _shell.withVarSet(
              async () => packManagerKey,
              async () => key,
            )
          }
          if (value[op]) {
            _shell = _shell.withVarArrSet(
              async () => packGroupsKey,
              async () => value[op],
            )
          }
          _shell = _shell.withVarSet(
            async () => packNamesKey,
            async () => value.names.join(' '),
          )
          _shell = _shell.withFsFileLoad(async () => [packKey, op])
          if (value[op]) {
            _shell = _shell.withVarUnset(async () => packGroupsKey)
          }
          if (!manager) {
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
      .withFsFileLoad(async () => [packKey, op])
  }

  return await _shell.build()
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
    return await workOp(context, environment, shell, 'add')
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
    return await workOp(context, environment, shell, 'find')
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
    return await shell.withFsFileLoad(async () => ['pack', 'list']).build()
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
    return await shell.withFsFileLoad(async () => ['pack', 'out']).build()
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
    return await workOp(context, environment, shell, 'rem')
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
    let _shell = shell.withFsFileLoad(async () => ['pack', 'sync'])
    if (toEnvKey('pack', 'sync', 'tidy') in environment) {
      _shell = shell.withFsFileLoad(async () => ['pack', 'tidy'])
    }
    return await _shell.build()
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
    return await shell.withFsFileLoad(async () => ['pack', 'tidy']).build()
  }
}
