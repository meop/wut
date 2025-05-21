import { getCfgFsFileLoad, localCfgPath } from '../cfg'
import { type Cmd, CmdBase } from '../cmd'
import type { Ctx } from '../ctx'
import { type Env, toEnvKey } from '../env'
import {
  type AclPerm,
  getFilePaths,
  getPlatAclPermCmds,
  isDir,
  toRelParts,
} from '../path'
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

type Sync = {
  [key: string]: [
    {
      in: string
      out: {
        [key: string]: string
      }
      perm?: AclPerm
    },
  ]
}

const CFG_EXT = 'yaml'
const PARAM_SPLITTER = '|'

const LOG_KEY = toEnvKey('log')

const FILE_KEY = 'file'

const FILE_OP_KEYS_KEY = (op: string) => toEnvKey(FILE_KEY, op, 'keys')
const FILE_OP_PARTS_KEY = (op: string) => toEnvKey(FILE_KEY, op, 'parts')
const FILE_OP_CLEAR_DIRS_KEY = (op: string) =>
  toEnvKey(FILE_KEY, op, 'clear', 'dirs')
const FILE_OP_PATH_PAIRS_KEY = (op: string) =>
  toEnvKey(FILE_KEY, op, 'path', 'pairs')
const FILE_OP_PATH_PERMS_KEY = (op: string) =>
  toEnvKey(FILE_KEY, op, 'path', 'perms')

async function workOp(context: Ctx, environment: Env, shell: Sh, op: string) {
  let _shell = shell
  const filters: Array<string> = []
  if (FILE_OP_PARTS_KEY(op) in environment) {
    filters.push(...environment[FILE_OP_PARTS_KEY(op)].split(' '))
  }

  const content: Sync = await getCfgFsFileLoad(async () => [FILE_KEY], CFG_EXT)

  const sys_os_plat = context.sys_os_plat ?? ''

  const validKeys: Array<string> = []
  for (const key of Object.keys(content).filter(
    k => !filters.length || filters.find(f => k.startsWith(f)),
  )) {
    if (content[key].find(p => sys_os_plat in p.out)) {
      validKeys.push(key)
    }
  }

  _shell = _shell
    .withFsFileLoad(async () => [FILE_KEY, op])
    .withFsFileLoad(async () => [FILE_KEY])

  if (op === 'find') {
    _shell = _shell.withVarArrSet(
      async () => FILE_OP_KEYS_KEY(op),
      async () => validKeys,
    )
  } else {
    const validClearDirs: Array<string> = []
    const validPairs: Array<string> = []
    const validPerms: Array<string> = []

    for (const key of validKeys) {
      for (const entry of content[key]) {
        const localDirPath = localCfgPath([FILE_KEY, key, entry.in])
        if (await isDir(localDirPath)) {
          validClearDirs.push(
            `${key}${PARAM_SPLITTER}${entry.out[sys_os_plat]}`,
          )
          for (const filePath of await getFilePaths(localDirPath)) {
            const filePathParts = toRelParts(localDirPath, filePath, false)
            validPairs.push(
              `${key}${PARAM_SPLITTER}${[key, entry.in, ...filePathParts].join('/')}${PARAM_SPLITTER}${[entry.out[sys_os_plat], ...filePathParts].join('/')}`,
            )
          }
        } else {
          validPairs.push(
            `${key}${PARAM_SPLITTER}${[key, entry.in].join('/')}${PARAM_SPLITTER}${entry.out[sys_os_plat]}`,
          )
        }
        if (entry.perm) {
          for (const permCmd of getPlatAclPermCmds(
            sys_os_plat,
            entry.out[sys_os_plat],
            entry.perm,
            context.sys_user ?? '',
          )) {
            validPerms.push(`${key}${PARAM_SPLITTER}${permCmd}`)
          }
        }
      }
    }

    _shell = _shell.withVarArrSet(
      async () => FILE_OP_PATH_PAIRS_KEY(op),
      async () => validPairs,
    )

    if (op === 'sync') {
      if (validClearDirs.length) {
        _shell = _shell.withVarArrSet(
          async () => FILE_OP_CLEAR_DIRS_KEY(op),
          async () => validClearDirs,
        )
      }

      if (validPerms.length) {
        _shell = _shell.withVarArrSet(
          async () => FILE_OP_PATH_PERMS_KEY(op),
          async () => validPerms,
        )
      }
    }
  }

  _shell = _shell.with(async () => [FILE_KEY])

  const body = await _shell.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

export class FileCmdDiff extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'diff'
    this.desc = 'diff on local'
    this.aliases = ['d', 'di']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }

  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}

export class FileCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.desc = 'find from remote'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'parts', desc: 'path part(s) to match' }]
  }

  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
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

  async work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return await workOp(context, environment, shell, this.name)
  }
}
