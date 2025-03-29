import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import type { Sh } from '../sh'

export class ScriptCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'script'
    this.desc = 'script ops'
    this.aliases = ['s', 'sc', 'scr', 'script']
    this.scopes = [...scopes, this.name]
    this.commands = [
      new ScriptCmdExec(this.scopes),
      new ScriptCmdList(this.scopes),
    ]
  }
}

export class ScriptCmdExec extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'exec'
    this.desc = 'exec from local'
    this.aliases = ['e', 'ex', 'exe', 'exec', 'execute']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return ''
  }
}

export class ScriptCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super()
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
    this.scopes = [...scopes, this.name]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const parts = ['script']
    if ('script_parts'.toUpperCase() in environment) {
      parts.push(environment['script_parts'.toUpperCase()])
    }
    return shell.withFsDirList(...parts).build()
  }
}
