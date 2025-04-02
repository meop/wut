import { buildCfgFilePath, loadCfgFileContents } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import type { Sh } from '../sh'
import { toCon, toFmt } from '../serde'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'pack'
    this.desc = 'package ops'
    this.aliases = ['p', 'package', 'pk', 'pkg']
    this.options = [{ keys: ['-m', '--manager'], desc: 'package manager' }]
    this.scopes = scopes
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
    _shell = _shell.withVarUnset(packPresetsKey)

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

            if (!manager) {
              _shell = _shell.withVarSet(packManagerKey, key)
            }
            if (value[op]) {
              _shell = _shell.withVarArrSet(packPresetsKey, value[op])
            }
            if (value?.names?.length) {
              _shell = _shell.withVarSet(packNamesKey, value.names.join(' '))
            }
            _shell = _shell.withFsFileLoad(packKey, op)
            if (value[op]) {
              _shell = _shell.withVarUnset(packPresetsKey)
            }
            if (!manager) {
              _shell = _shell.withVarUnset(packManagerKey)
            }
            foundNames.push(name)
          }
        } else {
          _shell = _shell.withPrint(
            toCon(
              {
                [name]: contents,
              },
              toFmt(environment['format'.toUpperCase()]),
            ),
          )
        }
      }
    }
  }

  const remainingNames = requestedNames.filter(n => !foundNames.includes(n))

  if (remainingNames.length) {
    _shell = _shell.withVarSet(packNamesKey, remainingNames.join(' '))
    _shell = _shell.withFsFileLoad(packKey, op)
  }

  return _shell.build()
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'add'
    this.desc = 'add from web'
    this.aliases = ['a', 'in', 'install']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-p', '--presets'], desc: 'check for presets' }]
    this.scopes = [...scopes, this.name]
  }
  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return workPreset(context, environment, shell, 'add')
  }
}

export class PackCmdDel extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'del'
    this.desc = 'delete from local'
    this.aliases = ['d', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-p', '--presets'], desc: 'check for presets' }]
    this.scopes = [...scopes, this.name]
  }
  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return workPreset(context, environment, shell, 'del')
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'find'
    this.desc = 'find from web'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.switches = [{ keys: ['-p', '--presets'], desc: 'check for presets' }]
    this.scopes = [...scopes, this.name]
  }
  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return workPreset(context, environment, shell, 'find')
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad('pack', 'list').build()
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'out'
    this.desc = 'out of sync from local'
    this.aliases = ['o', 'ou', 'outdated', 'ob', 'obs', 'obsolete', 'ol', 'old']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad('pack', 'out').build()
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'tidy'
    this.desc = 'tidy from local'
    this.aliases = ['t', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge']
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad('pack', 'tidy').build()
  }
}

export class PackCmdUp extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'up'
    this.desc = 'sync up from web'
    this.aliases = ['u', 'update', 'upgrade', 'sy', 'sync']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withFsFileLoad('pack', 'up').build()
  }
}
