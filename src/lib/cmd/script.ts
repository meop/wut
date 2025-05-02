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

const logKey = toEnvKey('log')

const script = 'script'
const scriptOpPartsKey = (op: string) => toEnvKey(script, op, 'parts')
const scriptOpContentsKey = (op: string) => toEnvKey(script, op, 'contents')

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
    const op = 'find'

    if (scriptOpPartsKey(op) in environment) {
      filters.push(...environment[scriptOpPartsKey(op)].split(' '))
    }

    const body = await shell
      .withFsDirPrint(async () => [script], {
        filters: async () => filters,
        content: scriptOpContentsKey(op) in environment,
        name: true,
      })
      .build()

    if (environment[logKey]) {
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
    const op = 'run'

    if (scriptOpPartsKey(op) in environment) {
      filters.push(...environment[scriptOpPartsKey(op)].split(' '))
    }

    const body = await shell
      .withFsDirLoad(async () => [script], {
        filters: async () => filters,
      })
      .build()

    if (environment[logKey]) {
      console.log(body)
    }

    return body
  }
}
