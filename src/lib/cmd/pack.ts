import { type Cmd, CmdBase } from '../cmd'

export class PackCmd extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'pack'
    this.desc = 'package manager ops'
    this.aliases = ['p', 'package']
    this.options = [
      { keys: ['-m', '--manager'], desc: 'package manager to use' },
    ]
    this.roots = roots
    this.commands = [
      new PackCmdAdd([...roots, this.name]),
      new PackCmdDel([...roots, this.name]),
      new PackCmdFind([...roots, this.name]),
      new PackCmdList([...roots, this.name]),
      new PackCmdOut([...roots, this.name]),
      new PackCmdTidy([...roots, this.name]),
      new PackCmdUp([...roots, this.name]),
    ]
  }
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'add'
    this.desc = 'add from web'
    this.aliases = ['a', 'in', 'install']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.roots = roots
  }
  doWork(): Cmd {
    return this
  }
}

export class PackCmdDel extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'del'
    this.desc = 'delete from local'
    this.aliases = ['d', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.roots = roots
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'find'
    this.desc = 'find from web'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'names', desc: 'name(s) to match', req: true }]
    this.roots = roots
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.roots = roots
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'out'
    this.desc = 'out of sync from local'
    this.aliases = ['o', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.roots = roots
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'tidy'
    this.desc = 'tidy from local'
    this.aliases = ['t', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge']
    this.roots = roots
  }
}

export class PackCmdUp extends CmdBase implements Cmd {
  constructor(roots: Array<string>) {
    super()
    this.name = 'up'
    this.desc = 'sync up from web'
    this.aliases = ['u', 'update', 'upgrade', 'sy', 'sync']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.roots = roots
  }
}
