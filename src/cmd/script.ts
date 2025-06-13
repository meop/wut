import type { Cli } from '../cli'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'

export class ScriptCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'script'
    this.description = 'shell script ops'
    this.aliases = ['s', 'sc', 'scr']
    this.commands = [
      new ScriptCmdExec([...this.scopes, this.name]),
      new ScriptCmdFind([...this.scopes, this.name]),
    ]
  }
}

const LOG_KEY = toEnvKey('log')

const SCRIPT_KEY = 'script'
const SCRIPT_OP_PARTS_KEY = (op: string) => toEnvKey(SCRIPT_KEY, op, 'parts')

async function workOp(client: Cli, context: Ctx, environment: Env, op: string) {
  let _client = client
  const filters: Array<string> = []
  if (SCRIPT_OP_PARTS_KEY(op) in environment) {
    filters.push(...environment[SCRIPT_OP_PARTS_KEY(op)].split(' '))
  }

  if (op === 'exec') {
    _client = _client.withFsDirLoad(async () => [SCRIPT_KEY], {
      filters: async () => filters,
    })
  } else if (op === 'find') {
    _client = _client.withFsDirPrint(async () => [SCRIPT_KEY], {
      filters: async () => filters,
    })
  }

  const body = await client.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

export class ScriptCmdExec extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'exec'
    this.description = 'exec on local'
    this.aliases = ['e', 'execute', 'ru', 'run']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  async work(client: Cli, context: Ctx, environment: Env): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class ScriptCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find on web'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  async work(client: Cli, context: Ctx, environment: Env): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}
