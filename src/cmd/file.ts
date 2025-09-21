import type { Cli } from '@meop/shire/cli'
import { Powershell } from '@meop/shire/cli/pwsh'
import { Zshell } from '@meop/shire/cli/zsh'
import { type Cmd, CmdBase } from '@meop/shire/cmd'
import { Ctx, withCtx } from '@meop/shire/ctx'
import { type Env, SPLIT_VAL, toKey } from '@meop/shire/env'
import { getFilePaths, isDirPath, isPath } from '@meop/shire/path'
import { Fmt } from '@meop/shire/serde'

import { getCfgFsFileLoad, localCfgPaths } from '../cfg.ts'
import { type AclPerm, getPlatAclPermCmds, toRelParts } from '../path.ts'

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

const PARAM_SPLIT = '|'

const FILE_KEY = 'file'

const FILE_OP_KEYS_KEY = (op: string) => toKey(FILE_KEY, op, 'keys')
const FILE_OP_PARTS_KEY = (op: string) => toKey(FILE_KEY, op, 'parts')
const FILE_OP_CLEAR_DIRS_KEY = (op: string) =>
  toKey(FILE_KEY, op, 'clear', 'dirs')
const FILE_OP_PATH_PAIRS_KEY = (op: string) =>
  toKey(FILE_KEY, op, 'path', 'pairs')
const FILE_OP_PATH_PERMS_KEY = (op: string) =>
  toKey(FILE_KEY, op, 'path', 'perms')

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
  const filters = environment.get(FILE_OP_PARTS_KEY(op))?.split(SPLIT_VAL) ?? []

  const content: Sync = await getCfgFsFileLoad(Promise.resolve([FILE_KEY]), {
    extension: Fmt.yaml,
  })
  if (content == null) {
    throw new Error(`no cfg file found: ${FILE_KEY}.${Fmt.yaml}`)
  }

  const sys_os_plat = context.sys_os_plat ?? ''

  const validKeys: Array<string> = []
  for (
    const key of Object.keys(content).filter(
      (k) => !filters.length || filters.find((f) => k.startsWith(f)),
    )
  ) {
    if (content[key].find((p) => sys_os_plat in p.out)) {
      validKeys.push(key)
    }
  }

  _client = _client
    .with(_client.fileLoad(Promise.resolve([FILE_KEY, FILE_KEY, op])))
    .with(_client.fileLoad(Promise.resolve([FILE_KEY, FILE_KEY])))

  if (op === 'find') {
    _client = _client.with(
      _client.varArrSet(
        Promise.resolve(FILE_OP_KEYS_KEY(op)),
        Promise.resolve(validKeys.map((x) => _client.toInner(x))),
      ),
    )
  } else {
    const validClearDirs: Set<string> = new Set()
    const validPairs: Array<string> = []
    const validPerms: Array<string> = []

    for (const key of validKeys) {
      for (const entry of content[key]) {
        const entry_in = withCtx(entry.in, context)
        const entry_out = entry.out
        const entry_perm = entry.perm

        if (!(sys_os_plat in entry_out)) {
          continue
        }
        const localEntryPaths = localCfgPaths([FILE_KEY, key, entry_in]).filter(
          async (x) => await isPath(x),
        )
        if (!localEntryPaths.length) {
          continue
        }
        if (await isDirPath(localEntryPaths[0])) {
          for (const localEntryPath of localEntryPaths) {
            validClearDirs.add(
              _client.toOuter(`${key}${PARAM_SPLIT}${entry_out[sys_os_plat]}`),
            )
            for (const filePath of await getFilePaths(localEntryPath)) {
              const filePathParts = toRelParts(localEntryPath, filePath, false)
              const srcFull = _client.toInner(
                [key, entry_in, ...filePathParts].join('/'),
              )
              const dstFull = _client.toInner(
                [entry_out[sys_os_plat], ...filePathParts].join('/'),
              )
              validPairs.push(
                _client.toOuter(
                  `${key}${PARAM_SPLIT}${srcFull}${PARAM_SPLIT}${dstFull}`,
                ),
              )
            }
          }
        } else {
          const srcFull = _client.toInner([key, entry_in].join('/'))
          const dstFull = _client.toInner(entry_out[sys_os_plat])
          validPairs.push(
            _client.toOuter(
              `${key}${PARAM_SPLIT}${srcFull}${PARAM_SPLIT}${dstFull}`,
            ),
          )
        }
        if (entry_perm) {
          for (
            const permCmd of getPlatAclPermCmds(
              sys_os_plat,
              entry_out[sys_os_plat],
              entry_perm,
              context.sys_user ?? '',
            )
          ) {
            const permCmdFull = context.sys_os_plat === 'winnt'
              ? Powershell.execStr(_client.toInner(permCmd))
              : Zshell.execStr(_client.toInner(permCmd))
            validPerms.push(
              _client.toOuter(`${key}${PARAM_SPLIT}${permCmdFull}`),
            )
          }
        }
      }
    }

    _client = _client.with(
      _client.varArrSet(
        Promise.resolve(FILE_OP_PATH_PAIRS_KEY(op)),
        Promise.resolve(validPairs),
      ),
    )

    if (op === 'sync') {
      if (validClearDirs.size) {
        _client = _client.with(
          _client.varArrSet(
            Promise.resolve(FILE_OP_CLEAR_DIRS_KEY(op)),
            Promise.resolve([...validClearDirs]),
          ),
        )
      }

      if (validPerms.length) {
        _client = _client.with(
          _client.varArrSet(
            Promise.resolve(FILE_OP_PATH_PERMS_KEY(op)),
            Promise.resolve(validPerms),
          ),
        )
      }
    }
  }

  _client = _client.with(Promise.resolve([FILE_KEY]))

  const body = await _client.build()

  if (environment.get('log')) {
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

  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
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

  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
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

  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await workOp(client, context, environment, this.name)
  }
}
