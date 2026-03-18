import { type Cmd, CmdBase } from '@meop/shire/cmd'
import { Ctx, withCtx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { getFilePaths, isDirPath } from '@meop/shire/path'
import { joinVal } from '@meop/shire/reg'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgFileLoad, localCfgPaths } from '../cfg.ts'
import { type AclPerm, getPlatAclPermCmds, toRelParts } from '../path.ts'
import { execNativeShell, redirectCommonShell } from '../sh.ts'

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

type Sync = Record<string, {
  aliases?: Array<string>
  maps?: Array<{
    in: string
    out: Record<string, string>
    permission?: AclPerm
  }>
}>

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

async function execOp(shell: Sh, context: Ctx, environment: Env, op: string) {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  let _shell = shell
  const filters = environment.getSplit(FILE_OP_PARTS_KEY(op))

  const content: Sync = await getCfgFileLoad([FILE_KEY], {
    extension: Fmt.yaml,
  })
  if (content == null) {
    throw new Error(`config file not found: ${FILE_KEY}.${Fmt.yaml}`)
  }

  const sysOsPlat = context.sys_os_plat

  const validKeys: Array<string> = []
  for (
    const key of Object.keys(content).filter((k) =>
      !filters.length ||
      filters.find((f) => {
        const inValues = content[k]?.maps?.map((m) => m.in) ?? []
        return op === 'find'
          ? k.includes(f) ||
            content[k]?.aliases?.find((a) => a.includes(f)) ||
            inValues.find((i) => i.includes(f))
          : k.startsWith(f) || content[k]?.aliases?.find((a) => a.startsWith(f))
      })
    )
  ) {
    if (sysOsPlat && content[key]?.maps?.find((p) => sysOsPlat in p.out)) {
      validKeys.push(key)
    }
  }

  _shell = _shell
    .with(
      await _shell.fileLoad(
        [FILE_KEY, FILE_KEY, op],
        import.meta.resolve,
        ['..'],
      ),
    )
    .with(
      await _shell.fileLoad(
        [FILE_KEY, FILE_KEY],
        import.meta.resolve,
        ['..'],
      ),
    )

  if (op === 'find') {
    _shell = _shell.with(
      _shell.varSetArr(
        FILE_OP_KEYS_KEY(op),
        validKeys.map((x) => {
          const keyPart = joinKey(x, content[x].aliases)
          const inPart = (content[x].maps ?? []).map((m) => withCtx(m.in, context)).join(', ')
          return inPart ? `${keyPart}|${inPart}` : keyPart
        }).toSorted(),
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
      for (const map of entry.maps ?? []) {
        const map_in = withCtx(map.in, context)
        const map_out = map.out
        const map_permission = map.permission
        if (!(sysOsPlat && sysOsPlat in map_out)) {
          continue
        }
        const localEntryPaths = await localCfgPaths([FILE_KEY, key, map_in])
        if (!localEntryPaths.length) {
          continue
        }
        if (await isDirPath(localEntryPaths[0])) {
          for (const localEntryPath of localEntryPaths) {
            validDirs.add(joinVal(compoundKey, map_out[sysOsPlat]))
            for (const filePath of await getFilePaths(localEntryPath)) {
              const filePathParts = toRelParts(localEntryPath, filePath, false)
              validPairs.push(
                joinVal(
                  compoundKey,
                  [key, map_in, ...filePathParts].join('/'),
                  [map_out[sysOsPlat], ...filePathParts].join('/'),
                ),
              )
            }
          }
        } else {
          validPairs.push(joinVal(compoundKey, [key, map_in].join('/'), map_out[sysOsPlat]))
        }
        if (map_permission) {
          for (
            const permCmd of getPlatAclPermCmds(
              sysOsPlat,
              map_out[sysOsPlat],
              map_permission,
              context.sys_user ?? '',
            )
          ) {
            validPerms.push(
              joinVal(compoundKey, execNativeShell(_shell, sysOsPlat, permCmd)),
            )
          }
        }
      }
    }

    _shell = _shell.with(
      _shell.varSetArr(FILE_OP_PATH_PAIRS_KEY(op), validPairs),
    )

    if (op === 'sync') {
      if (validDirs.size) {
        _shell = _shell.with(
          _shell.varSetArr(FILE_OP_CLEAR_DIRS_KEY(op), [...validDirs]),
        )
      }

      if (validPerms.length) {
        _shell = _shell.with(
          _shell.varSetArr(FILE_OP_PATH_PERMS_KEY(op), validPerms),
        )
      }
    }
  }

  _shell = _shell.with([FILE_KEY])

  const body = _shell.build()

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
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
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
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
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
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}
