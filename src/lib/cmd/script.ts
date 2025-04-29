import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import type { Sh } from '../sh'

export class ScriptCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'script'
    this.desc = 'shell script ops'
    this.aliases = ['s', 'sc', 'scr', 'script']
    this.commands = [
      new ScriptCmdFind([...this.scopes, this.name]),
      new ScriptCmdRun([...this.scopes, this.name]),
    ]
  }
}

export class ScriptCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from local'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
    this.switches = [{ keys: ['-c', '--contents'], desc: 'print contents' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const filters: Array<string> = []
    const scriptFindPartsKey = toEnvKey('script', 'find', 'parts')
    const scriptFindContentsKey = toEnvKey('script', 'find', 'contents')

    if (scriptFindPartsKey in environment) {
      filters.push(...environment[scriptFindPartsKey].split(' '))
    }

    const body = await shell
      .withFsDirPrint(async () => ['script'], {
        filters: async () => filters,
        content: scriptFindContentsKey in environment,
        name: true,
      })
      .build()

    if (environment[toEnvKey('log')]) {
      console.log(body)
    }

    return body
  }
}

export class ScriptCmdRun extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'run'
    this.desc = 'run from local'
    this.aliases = ['r', 'ru']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const filters: Array<string> = []
    const scriptRunPartsKey = toEnvKey('script', 'run', 'parts')
    if (scriptRunPartsKey in environment) {
      filters.push(...environment[scriptRunPartsKey].split(' '))
    }

    const body = await shell
      .withFsDirLoad(async () => ['script'], {
        filters: async () => filters,
      })
      .build()

    if (environment[toEnvKey('log')]) {
      console.log(body)
    }

    return body
  }
}
