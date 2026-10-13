import { type Cmd, CmdBase } from '@meop/shire/cmd'
import { Ctx, withCtx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { joinVal } from '@meop/shire/reg'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgFileLoad, localCfgPaths } from '../cfg.ts'
import { getFilePaths, isDirPath } from '../fs.ts'
import { sameName, wordStartsWith } from '../match.ts'
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
      new FileCmdList([...this.scopes, this.name]),
      new FileCmdSync([...this.scopes, this.name]),
    ]
  }
}

type Sync = Record<string, {
  maps?: Array<{
    in: string
    out: Record<string, string>
    permission?: AclPerm
  }>
}>

const FILE_KEY = 'file'

const FILE_OP_KEY = [FILE_KEY, 'op']
const FILE_OP_KEYS_KEY = (op: string) => [FILE_KEY, op, 'keys']
const FILE_OP_PARTS_KEY = (op: string) => [FILE_KEY, op, 'parts']
const FILE_OP_CLEAR_DIRS_KEY = (op: string) => [FILE_KEY, op, 'clear', 'dirs']
const FILE_OP_PATH_PAIRS_KEY = (op: string) => [FILE_KEY, op, 'path', 'pairs']
const FILE_OP_PATH_PERMS_KEY = (op: string) => [FILE_KEY, op, 'path', 'perms']
const FILE_OP_TOOLS_KEY = (op: string) => [FILE_KEY, op, 'tools']

// the nu name for a key, matching how varSet* renders it
const shellEnvKey = (parts: Array<string>) => parts.join('_').toUpperCase()

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
      filters.every((f) => {
        // a key is the one name a tool goes by. diff and sync take it whole; find and list read, so they take the
        // start of a word, and look further, into the paths the tool's files come from
        return op === 'find' || op === 'list'
          ? wordStartsWith(k, f) || content[k]?.maps?.some((m) => wordStartsWith(m.in, f))
          : sameName(k, f)
      })
    )
  ) {
    if (sysOsPlat && content[key]?.maps?.find((p) => sysOsPlat in p.out)) {
      validKeys.push(key)
    }
  }

  if (filters.length && !validKeys.length) {
    const body = _shell.with(_shell.printWarn(`no file matched: ${filters.join(' ')}`)).build()
    if (environment.get(['log'])) {
      console.log(body)
    }
    return body
  }

  _shell = _shell
    .with(await _shell.fileLoad(['sel'], import.meta.resolve, ['..']))
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
          const inPart = (content[x].maps ?? []).map((m) => withCtx(m.in, context)).join(', ')
          return inPart ? `${x}|${inPart}` : x
        }).toSorted(),
      ),
    )
  } else {
    const validDirs: Set<string> = new Set()
    const validPairs: Array<string> = []
    const validPerms: Array<string> = []
    for (const key of validKeys) {
      const entry = content[key]
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
            validDirs.add(joinVal(key, map_out[sysOsPlat]))
            for (const filePath of await getFilePaths(localEntryPath)) {
              const filePathParts = toRelParts(localEntryPath, filePath, false)
              validPairs.push(
                joinVal(
                  key,
                  [key, map_in, ...filePathParts].join('/'),
                  [map_out[sysOsPlat], ...filePathParts].join('/'),
                ),
              )
            }
          }
        } else {
          validPairs.push(joinVal(key, [key, map_in].join('/'), map_out[sysOsPlat]))
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
              joinVal(key, execNativeShell(_shell, sysOsPlat, permCmd)),
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

  _shell = _shell.with(_shell.varSetStr(FILE_OP_KEY, op))
  // sync writes and diff fetches: both do a GET per pair, so both state the plan and ask before any of it runs.
  // find and list only read what the server already sent, so there is nothing to gate
  const gated = op === 'sync' || op === 'diff'
  _shell = _shell.with(
    gated
      ? [
        `if not (filePlanShow '${shellEnvKey(FILE_OP_PATH_PAIRS_KEY(op))}' '${
          shellEnvKey(FILE_OP_CLEAR_DIRS_KEY(op))
        }' '${shellEnvKey(FILE_OP_TOOLS_KEY(op))}') {`,
        '  return',
        '}',
        FILE_KEY,
      ]
      : [FILE_KEY],
  )

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

export class FileCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.description = 'list on local'
    this.aliases = ['l', 'li', 'ls']
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
