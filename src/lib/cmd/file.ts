import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import type { Sh } from '../sh'

export class FileCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'file'
    this.desc = 'dot file ops'
    this.aliases = ['f', 'fi']
    this.commands = [
      new FileCmdDiff([...this.scopes, this.name]),
      new FileCmdFind([...this.scopes, this.name]),
      new FileCmdSync([...this.scopes, this.name]),
    ]
  }
}

const LOG_KEY = toEnvKey('log')

const FILE_KEY = 'file'
const FILE_OP_PARTS_KEY = (op: string) => toEnvKey(FILE_KEY, op, 'parts')
const FILE_OP_CONTENTS_KEY = (op: string) => toEnvKey(FILE_KEY, op, 'contents')

export class FileCmdDiff extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'diff'
    this.desc = 'diff on local'
    this.aliases = ['d', 'di']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
}

export class FileCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from remote'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
    this.switches = [{ keys: ['-c', '--contents'], desc: 'print contents' }]
  }
}

export class FileCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.desc = 'sync from remote'
    this.aliases = ['s', 'sy']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }
}
