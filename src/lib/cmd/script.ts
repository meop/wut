import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import type { Env } from '../env'
import type { Sh } from '../sh'

export class ScriptCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'script'
    this.desc = 'shell script ops'
    this.aliases = ['s', 'sc', 'scr', 'script']
    this.commands = [
      new ScriptCmdRun([...this.scopes, this.name]),
      new ScriptCmdList([...this.scopes, this.name]),
    ]
  }
}

export class ScriptCmdRun extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'run'
    this.desc = 'run from local'
    this.aliases = ['r', 'ex', 'exe', 'exec', 'execute']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const filters: Array<string> = []
    const scriptRunPartsKey = 'script_run_parts'.toUpperCase()
    if (scriptRunPartsKey in environment) {
      filters.push(...environment[scriptRunPartsKey].split(' '))
    }

    return shell
      .withFsDirLoad(
        async () => ['script'],
        async () => filters,
      )
      .build()
  }
}

export class ScriptCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.desc = 'list from local'
    this.aliases = ['l', 'li', 'ls', 'qu', 'query']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const filters: Array<string> = []
    const scriptListPartsKey = 'script_list_parts'.toUpperCase()
    if (scriptListPartsKey in environment) {
      filters.push(...environment[scriptListPartsKey].split(' '))
    }

    return shell
      .withFsDirList(
        async () => ['script'],
        async () => filters,
      )
      .build()
  }
}
