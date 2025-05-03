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

async function workOp(context: Ctx, environment: Env, shell: Sh, op: string) {
  let _shell = shell
  const filters: Array<string> = []
  if (scriptOpPartsKey(op) in environment) {
    filters.push(...environment[scriptOpPartsKey(op)].split(' '))
  }

  if (op === 'find') {
    _shell = _shell.withFsDirPrint(async () => [script], {
      filters: async () => filters,
      content: scriptOpContentsKey(op) in environment,
      name: true,
    })
  } else if (op === 'run') {
    _shell = _shell.withFsDirLoad(async () => [script], {
      filters: async () => filters,
    })
  }

  const body = await shell.build()

  if (environment[logKey]) {
    console.log(body)
  }

  return body
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
    return await workOp(context, environment, shell, 'find')
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
    return await workOp(context, environment, shell, 'run')
  }
}
