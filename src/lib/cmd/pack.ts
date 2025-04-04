import { buildCfgFilePath, loadCfgFileContents } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import { toCon, toFmt } from '../serde'
import type { Sh } from '../sh'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.desc = 'package manager ops'
    this.aliases = ['p', 'pa', 'package', 'pk', 'pkg']
    this.options = [{ keys: ['-m', '--manager'], desc: 'package manager' }]
    this.commands = [
      new PackCmdAdd([...this.scopes, this.name]),
      new PackCmdDel([...this.scopes, this.name]),
      new PackCmdFind([...this.scopes, this.name]),
      new PackCmdList([...this.scopes, this.name]),
      new PackCmdOut([...this.scopes, this.name]),
      new PackCmdTidy([...this.scopes, this.name]),
      new PackCmdUp([...this.scopes, this.name]),
    ]
  }
}

async function workPreset(
  context: Ctx,
  environment: Env,
  shell: Sh,
  op: string,
) {
  const packKey = 'pack'
  const packManagerKey = 'pack_manager'.toUpperCase()
  const packNamesKey = `pack_${op}_names`.toUpperCase()
  const packPresetsKey = `pack_${op}_presets`.toUpperCase()

  let _shell = shell

  const requestedNames = environment[packNamesKey].split(' ')
  const foundNames: Array<string> = []

  const manager = environment[packManagerKey]

  if (environment[packPresetsKey]) {
    _shell = _shell.withVarUnset(async () => packPresetsKey)

    for (const name of requestedNames) {
      const filePath = `${buildCfgFilePath(packKey, name)}.yaml`

      if (await Bun.file(filePath).exists()) {
        const contents = await loadCfgFileContents(filePath)
        if (op !== 'find') {
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
                async () => packPresetsKey,
                async () => value[op],
              )
            }
            _shell = _shell.withVarSet(
              async () => packNamesKey,
              async () => value.names.join(' '),
            )
            _shell = _shell.withFsFileLoad(async () => [packKey, op])
            if (value[op]) {
              _shell = _shell.withVarUnset(async () => packPresetsKey)
            }
            if (!manager) {
              _shell = _shell.withVarUnset(async () => packManagerKey)
            }
          }
        } else {
          _shell = _shell.withPrint(async () => [
            toCon(
              {
                [name]: contents,
              },
              toFmt(environment['format'.toUpperCase()]),
            ),
          ])
        }
        foundNames.push(name)
      }
    }
  }

  const remainingNames = requestedNames.filter(n => !foundNames.includes(n))

  if (remainingNames.length) {
    _shell = _shell.withVarSet(
      async () => packNamesKey,
      async () => remainingNames.join(' '),
    )
    _shell = _shell.withFsFileLoad(async () => [packKey, op])
  }

  return _shell.build()
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.desc = 'add from web'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-p', '--presets'], desc: 'check for presets' }]
  }
  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return workPreset(context, environment, shell, 'add')
  }
}

export class PackCmdDel extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'del'
    this.desc = 'delete from local'
    this.aliases = [
      'd',
      'de',
      'delete',
      'rm',
      'rem',
      'remove',
      'un',
      'uninstall',
    ]
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-p', '--presets'], desc: 'check for presets' }]
  }
  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return workPreset(context, environment, shell, 'del')
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from web'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-p', '--presets'], desc: 'check for presets' }]
  }
  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return workPreset(context, environment, shell, 'find')
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad(async () => ['pack', 'list']).build()
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'out'
    this.desc = 'out of sync from local'
    this.aliases = ['o', 'ou', 'outdated', 'ob', 'obs', 'obsolete', 'ol', 'old']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad(async () => ['pack', 'out']).build()
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.desc = 'tidy from local'
    this.aliases = ['t', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge']
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad(async () => ['pack', 'tidy']).build()
  }
}

export class PackCmdUp extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'up'
    this.desc = 'sync up from web'
    this.aliases = ['u', 'update', 'upgrade', 'sy', 'sync']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad(async () => ['pack', 'up']).build()
  }
}
