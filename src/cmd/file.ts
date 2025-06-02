import { getCfgFsFileLoad, localCfgPath } from '../cfg'
import type { Cli } from '../cli'
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

export class FileCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'file'
    this.description = 'dot file ops'
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
const PARAM_SPLIT = '|'

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

async function workOp(client: Cli, context: Ctx, environment: Env, op: string) {
  if (client.name !== 'nu') {
    const url = [
      context.req_orig,
      context.req_path.replace(`/cli/${client.name}`, '/cli/nu'),
      context.req_srch,
    ].join('')
    return `nu --no-config-file -c 'nu --no-config-file -c $"( http get --raw --redirect-mode follow "${url}" )"'`
  }

  let _client = client
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

  _client = _client
    .withFsFileLoad(async () => [FILE_KEY, op])
    .withFsFileLoad(async () => [FILE_KEY])

  if (op === 'find') {
    _client = _client.withVarArrSet(
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
          validClearDirs.push(`${key}${PARAM_SPLIT}${entry.out[sys_os_plat]}`)
          for (const filePath of await getFilePaths(localDirPath)) {
            const filePathParts = toRelParts(localDirPath, filePath, false)
            validPairs.push(
              `${key}${PARAM_SPLIT}${[key, entry.in, ...filePathParts].join('/')}${PARAM_SPLIT}${[entry.out[sys_os_plat], ...filePathParts].join('/')}`,
            )
          }
        } else {
          validPairs.push(
            `${key}${PARAM_SPLIT}${[key, entry.in].join('/')}${PARAM_SPLIT}${entry.out[sys_os_plat]}`,
          )
        }
        if (entry.perm) {
          for (const permCmd of getPlatAclPermCmds(
            sys_os_plat,
            entry.out[sys_os_plat],
            entry.perm,
            context.sys_user ?? '',
          )) {
            validPerms.push(`${key}${PARAM_SPLIT}${permCmd}`)
          }
        }
      }
    }

    _client = _client.withVarArrSet(
      async () => FILE_OP_PATH_PAIRS_KEY(op),
      async () => validPairs,
    )

    if (op === 'sync') {
      if (validClearDirs.length) {
        _client = _client.withVarArrSet(
          async () => FILE_OP_CLEAR_DIRS_KEY(op),
          async () => validClearDirs,
        )
      }

      if (validPerms.length) {
        _client = _client.withVarArrSet(
          async () => FILE_OP_PATH_PERMS_KEY(op),
          async () => validPerms,
        )
      }
    }
  }

  _client = _client.with(async () => [FILE_KEY])

  const body = await _client.build()

  if (environment[LOG_KEY]) {
    console.log(body)
  }

  return body
}

export class FileCmdDiff extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'diff'
    this.description = 'diff on local'
    this.aliases = ['d', 'di']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }

  async work(client: Cli, context: Ctx, environment: Env): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class FileCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }

  async work(client: Cli, context: Ctx, environment: Env): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}

export class FileCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.description = 'sync from remote'
    this.aliases = ['s', 'sy']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }

  async work(client: Cli, context: Ctx, environment: Env): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}
