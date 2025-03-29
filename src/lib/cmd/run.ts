import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import type { Sh } from '../sh'

export class RunCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'run'
    this.desc = 'run ops'
    this.aliases = ['r', 'ex', 'exe', 'exec', 'execute']
    this.scopes = [...scopes, this.name]
    this.commands = [new RunCmdList(this.scopes)]
  }
}

export class RunCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'names', desc: 'name(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {}
}
