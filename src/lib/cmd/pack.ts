import path from 'node:path'

import { getCfgFilePaths, loadCfgFileContents } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import type { Sh } from '../sh'
import { consStr } from '../seri'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'pack'
    this.desc = 'package ops'
    this.aliases = ['p', 'package']
    this.options = [{ keys: ['-m', '--manager'], desc: 'package manager' }]
    this.scopes = [...scopes, this.name]
    this.commands = [
      new PackCmdAdd(this.scopes),
      new PackCmdDel(this.scopes),
      new PackCmdFind(this.scopes),
      new PackCmdList(this.scopes),
      new PackCmdOut(this.scopes),
      new PackCmdTidy(this.scopes),
      new PackCmdUp(this.scopes),
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
  const packManagerKey = 'PACK_MANAGER'
  const packNamesKey = `PACK_${op.toUpperCase()}_NAMES`
  const packPresetKey = `PACK_${op.toUpperCase()}_PRESET`

  let _shell = shell

  const requestedNames = environment[packNamesKey].split(' ')
  const foundNames: Array<string> = []

  const manager = environment[packManagerKey]

  if (environment[packPresetKey]) {
    const presetFiles = await getCfgFilePaths([packKey])

    for (const name of requestedNames) {
      const presetFile = presetFiles.find(
        f => path.basename(f, '.yaml') === name,
      )
      if (presetFile) {
        const contents = await loadCfgFileContents(presetFile)
        for (const key of Object.keys(contents)) {
          if (manager && key !== manager) {
            continue
          }

          const value = contents[key]
          if (value[op]) {
            _shell = _shell.withSetVar(packPresetKey, value[op].join(';'))
          } else {
            _shell = _shell.withUnsetVar(packPresetKey)
          }
          _shell = _shell.withSetVar(packManagerKey, key)
          _shell = _shell.withSetVar(packNamesKey, value.names.join(' '))
          _shell = _shell.withLoadFilePath(packKey, op)
        }

        foundNames.push(name)
      }
    }

    _shell = _shell.withUnsetVar(packPresetKey)
    _shell = _shell.withUnsetVar(packManagerKey)
    if (manager) {
      _shell = _shell.withSetVar(packManagerKey, manager)
    }
  }

  const remainingNames = requestedNames.filter(n => !foundNames.includes(n))

  if (remainingNames.length) {
    _shell = _shell.withSetVar(packNamesKey, remainingNames.join(' '))
    _shell = _shell.withLoadFilePath(packKey, op)
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
    this.switches = [{ keys: ['-p', '--preset'], desc: 'check for preset' }]
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
    this.switches = [{ keys: ['-p', '--preset'], desc: 'check for preset' }]
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
    this.switches = [{ keys: ['-p', '--preset'], desc: 'check for preset' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const op = 'find'

    const packKey = 'pack'
    const packNamesKey = `PACK_${op.toUpperCase()}_NAMES`
    const packPresetKey = `PACK_${op.toUpperCase()}_PRESET`

    let _shell = shell

    const requestedNames = environment[packNamesKey].split(' ')
    const foundNames: Array<string> = []

    if (environment[packPresetKey]) {
      const presetFiles = await getCfgFilePaths([packKey])

      for (const name of requestedNames) {
        const presetFile = presetFiles.find(
          f => path.basename(f, '.yaml') === name,
        )
        if (presetFile) {
          const contents = await loadCfgFileContents(presetFile)

          _shell = _shell.withPrintInfo(`${name}:`)
          _shell = _shell.withPrint(consStr(contents))

          foundNames.push(name)
        }
      }
    }

    const remainingNames = requestedNames.filter(n => !foundNames.includes(n))

    if (remainingNames.length) {
      _shell = _shell.withSetVar(packNamesKey, remainingNames.join(' '))
      _shell = _shell.withLoadFilePath(packKey, op)
    }

    return _shell.build()
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
    return shell.withLoadFilePath('pack', 'list').build()
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'out'
    this.desc = 'out of sync from local'
    this.aliases = ['o', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withLoadFilePath('pack', 'out').build()
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
    return shell.withLoadFilePath('pack', 'tidy').build()
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
    return shell.withLoadFilePath('pack', 'up').build()
  }
}
