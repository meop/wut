import type { Cli } from '@meop/shire/cli'
import { Powershell } from '@meop/shire/cli/pwsh'
import { Zshell } from '@meop/shire/cli/zsh'
import { type Cmd, CmdBase } from '@meop/shire/cmd'
import { Ctx, withCtx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { getFilePaths, isDirPath } from '@meop/shire/path'
import { joinVal } from '@meop/shire/reg'
import { Fmt } from '@meop/shire/serde'
import { SysOsPlat } from '@meop/shire/sys'

import { getCfgFileLoad, localCfgPaths } from '../cfg.ts'
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
  [key: string]: {
    aliases?: Array<string>
    maps: [{
      in: string
      out: {
        [key: string]: string
      }
      permission?: AclPerm
    }]
  }
}

const KEY_SPLIT = ','

const FILE_KEY = 'file'

const FILE_OP_KEYS_KEY = (op: string) => [FILE_KEY, op, 'keys']
const FILE_OP_PARTS_KEY = (op: string) => [FILE_KEY, op, 'parts']
const FILE_OP_CLEAR_DIRS_KEY = (op: string) => [FILE_KEY, op, 'clear', 'dirs']
const FILE_OP_PATH_PAIRS_KEY = (op: string) => [FILE_KEY, op, 'path', 'pairs']
const FILE_OP_PATH_PERMS_KEY = (op: string) => [FILE_KEY, op, 'path', 'perms']

function joinKey(key: string, aliases?: Array<string>): string {
  return [key, ...aliases ?? []].join(KEY_SPLIT)
}

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
  const filters = environment.getSplit(FILE_OP_PARTS_KEY(op))

  const content: Sync = await getCfgFileLoad([FILE_KEY], {
    extension: Fmt.yaml,
  })
  if (content == null) {
    throw new Error(`config file not found: ${FILE_KEY}.${Fmt.yaml}`)
  }

  const sys_os_plat = context.sys_os_plat

  const validKeys: Array<string> = []
  for (
    const key of Object.keys(content).filter((k) =>
      !filters.length ||
      filters.find((f) =>
        k.startsWith(f) || content[k].aliases?.find((a) => a.startsWith(f))
      )
    )
  ) {
    if (sys_os_plat && content[key].maps.find((p) => sys_os_plat in p.out)) {
      validKeys.push(key)
    }
  }

  _client = _client
    .with(
      await _client.fileLoad(
        [FILE_KEY, FILE_KEY, op],
        import.meta.resolve,
        ['..'],
      ),
    )
    .with(
      await _client.fileLoad(
        [FILE_KEY, FILE_KEY],
        import.meta.resolve,
        ['..'],
      ),
    )

  if (op === 'find') {
    _client = _client.with(
      _client.varSetArr(
        FILE_OP_KEYS_KEY(op),
        validKeys.map((x) => _client.toOuter(joinKey(x, content[x].aliases)))
          .toSorted(),
      ),
    )
  } else {
    const validDirs: Set<string> = new Set()
    const validPairs: Array<string> = []
    const validPerms: Array<string> = []
    for (const key of validKeys) {
      const entry = content[key]
      const aliases = entry.aliases
      const compoundKey = joinKey(key, aliases)
      for (const map of entry.maps) {
        const map_in = withCtx(map.in, context)
        const map_out = map.out
        const map_permission = map.permission
        if (!(sys_os_plat && sys_os_plat in map_out)) {
          continue
        }
        const localEntryPaths = await localCfgPaths([FILE_KEY, key, map_in])
        if (!localEntryPaths.length) {
          continue
        }
        if (await isDirPath(localEntryPaths[0])) {
          for (const localEntryPath of localEntryPaths) {
            validDirs.add(
              _client.toOuter(
                joinVal(compoundKey, map_out[sys_os_plat]),
              ),
            )
            for (const filePath of await getFilePaths(localEntryPath)) {
              const filePathParts = toRelParts(localEntryPath, filePath, false)
              const srcFull = [key, map_in, ...filePathParts].join('/')
              const dstFull = [map_out[sys_os_plat], ...filePathParts].join('/')
              validPairs.push(
                _client.toOuter(
                  joinVal(compoundKey, srcFull, dstFull),
                ),
              )
            }
          }
        } else {
          const srcFull = [key, map_in].join('/')
          const dstFull = map_out[sys_os_plat]
          validPairs.push(
            _client.toOuter(
              joinVal(compoundKey, srcFull, dstFull),
            ),
          )
        }
        if (map_permission) {
          for (
            const permCmd of getPlatAclPermCmds(
              sys_os_plat,
              map_out[sys_os_plat],
              map_permission,
              context.sys_user ?? '',
            )
          ) {
            const permCmdFull = context.sys_os_plat === SysOsPlat.winnt
              ? Powershell.execStr(_client.toInner(permCmd))
              : Zshell.execStr(_client.toInner(permCmd))
            validPerms.push(
              _client.toOuter(
                joinVal(compoundKey, permCmdFull),
              ),
            )
          }
        }
      }
    }

    _client = _client.with(
      _client.varSetArr(FILE_OP_PATH_PAIRS_KEY(op), validPairs),
    )

    if (op === 'sync') {
      if (validDirs.size) {
        _client = _client.with(
          _client.varSetArr(FILE_OP_CLEAR_DIRS_KEY(op), [...validDirs]),
        )
      }

      if (validPerms.length) {
        _client = _client.with(
          _client.varSetArr(FILE_OP_PATH_PERMS_KEY(op), validPerms),
        )
      }
    }
  }

  _client = _client.with([FILE_KEY])

  const body = _client.build()

  if (environment.get(['log'])) {
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
