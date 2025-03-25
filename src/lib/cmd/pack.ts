import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import type { Sh } from '../sh'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'pack'
    this.desc = 'package manager ops'
    this.aliases = ['p', 'package']
    this.options = [
      { keys: ['-m', '--manager'], desc: 'package manager to use' },
    ]
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

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'add'
    this.desc = 'add from web'
    this.aliases = ['a', 'in', 'install']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withLoadFilePath('pack', 'add').build()
  }
}

export class PackCmdDel extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'del'
    this.desc = 'delete from local'
    this.aliases = ['d', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withLoadFilePath('pack', 'del').build()
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'find'
    this.desc = 'find from web'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return shell.withLoadFilePath('pack', 'find').build()
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
