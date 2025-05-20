import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import type { Sh } from '../sh'

export class ScriptCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'shell'
    this.desc = 'shell script ops'
    this.aliases = ['s', 'sh']
    this.commands = [
      new ScriptCmdFind([...this.scopes, this.name]),
      new ScriptCmdRun([...this.scopes, this.name]),
    ]
  }
}

const LOG_KEY = toEnvKey('log')

const SCRIPT_KEY = 'script'
const SCRIPT_OP_PARTS_KEY = (op: string) => toEnvKey(SCRIPT_KEY, op, 'parts')
const SCRIPT_OP_CONTENTS_KEY = (op: string) =>
  toEnvKey(SCRIPT_KEY, op, 'contents')

async function workOp(context: Ctx, environment: Env, shell: Sh, op: string) {
  let _shell = shell
  const filters: Array<string> = []
  if (SCRIPT_OP_PARTS_KEY(op) in environment) {
    filters.push(...environment[SCRIPT_OP_PARTS_KEY(op)].split(' '))
  }

  if (op === 'find') {
    _shell = _shell.withFsDirPrint(async () => [SCRIPT_KEY], {
      filters: async () => filters,
      content: SCRIPT_OP_CONTENTS_KEY(op) in environment,
      name: true,
    })
  } else if (op === 'run') {
    _shell = _shell.withFsDirLoad(async () => [SCRIPT_KEY], {
      filters: async () => filters,
    })
  }

  const body = await shell.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

export class ScriptCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find on web'
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
    this.desc = 'run on local'
    this.aliases = ['r', 'ru']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, 'run')
  }
}
