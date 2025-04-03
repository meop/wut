import { type Cmd, CmdBase } from '../cmd'

export class VirtCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'virt'
    this.desc = 'virtual manager ops'
    this.aliases = ['v', 'vi', 'vir', 'virtual']
    this.options = [{ keys: ['-m', '--manager'], desc: 'virtual manager' }]
    this.commands = [
      new VirtCmdDown([...this.scopes, this.name]),
      new VirtCmdList([...this.scopes, this.name]),
      new VirtCmdStat([...this.scopes, this.name]),
      new VirtCmdTidy([...this.scopes, this.name]),
      new VirtCmdUp([...this.scopes, this.name]),
    ]
  }
}

export class VirtCmdDown extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'down'
    this.desc = 'tear down from local'
    this.aliases = ['d', 'do', 'down']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
}

export class VirtCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
}

export class VirtCmdStat extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'stat'
    this.desc = 'status from local'
    this.aliases = ['s', 'st', 'sta', 'status']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
}

export class VirtCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.desc = 'tidy from local'
    this.aliases = ['t', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge']
  }
}

export class VirtCmdUp extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'up'
    this.desc = 'sync up from web'
    this.aliases = ['u', 'update', 'upgrade', 'sy', 'sync']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
  }
}
