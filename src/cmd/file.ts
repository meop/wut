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
import { execNativeShell, lockRun, redirectCommonShell } from '../sh.ts'

export class FileCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'file'
    this.description = 'dot file ops'
    this.aliases = ['f', 'fi']
    this.commands = [
      new FileCmdFind([...this.scopes, this.name]),
      new FileCmdList([...this.scopes, this.name]),
      new FileCmdOutdated([...this.scopes, this.name]),
      new FileCmdRemove([...this.scopes, this.name]),
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
const FILE_OP_DIRS_KEY = (op: string) => [FILE_KEY, op, 'dirs']
const FILE_OP_PATH_PAIRS_KEY = (op: string) => [FILE_KEY, op, 'path', 'pairs']
const FILE_OP_PATH_PERMS_KEY = (op: string) => [FILE_KEY, op, 'path', 'perms']
const FILE_OP_TOOLS_KEY = (op: string) => [FILE_KEY, op, 'tools']

// the nu name for a key, matching how varSet* renders it
const shellEnvKey = (parts: Array<string>) => parts.join('_').toUpperCase()

// one key's files for this platform: each source and destination pair, the directories a folder map writes into, and
// the permission commands to run after a write, every entry prefixed with the key. pack reads the same for a group's
// own key, so a pack writes its files exactly as `file sync <key>` would
export type FilePlan = { pairs: Array<string>; dirs: Array<string>; perms: Array<string> }

async function keyPlan(shell: Sh, context: Ctx, key: string, entry: Sync[string]): Promise<FilePlan> {
  const sysOsPlat = context.sys_os_plat ?? ''
  const plan: FilePlan = { pairs: [], dirs: [], perms: [] }
  for (const map of entry?.maps ?? []) {
    const map_in = withCtx(map.in, context)
    const map_out = map.out
    if (!(sysOsPlat in map_out)) {
      continue
    }
    const localEntryPaths = await localCfgPaths([FILE_KEY, key, map_in])
    if (!localEntryPaths.length) {
      continue
    }
    if (await isDirPath(localEntryPaths[0])) {
      for (const localEntryPath of localEntryPaths) {
        const dir = joinVal(key, map_out[sysOsPlat])
        if (!plan.dirs.includes(dir)) {
          plan.dirs.push(dir)
        }
        for (const filePath of await getFilePaths(localEntryPath)) {
          const filePathParts = toRelParts(localEntryPath, filePath, false)
          plan.pairs.push(
            joinVal(key, [key, map_in, ...filePathParts].join('/'), [map_out[sysOsPlat], ...filePathParts].join('/')),
          )
        }
      }
    } else {
      plan.pairs.push(joinVal(key, [key, map_in].join('/'), map_out[sysOsPlat]))
    }
    if (map.permission) {
      for (const permCmd of getPlatAclPermCmds(sysOsPlat, map_out[sysOsPlat], map.permission, context.sys_user ?? '')) {
        plan.perms.push(joinVal(key, execNativeShell(shell, sysOsPlat, permCmd)))
      }
    }
  }
  return plan
}

async function loadSync(): Promise<Sync> {
  const content: Sync = await getCfgFileLoad([FILE_KEY], { extension: Fmt.yaml })
  if (content == null) {
    throw new Error(`config file not found: ${FILE_KEY}.${Fmt.yaml}`)
  }
  return content
}

// a pack group's own files: the file.yaml key of the group's own name, when it has files on this platform
export async function ownFilePlan(shell: Sh, context: Ctx, key: string): Promise<FilePlan | null> {
  const entry = (await loadSync())[key]
  if (!entry) {
    return null
  }
  const plan = await keyPlan(shell, context, key, entry)
  return plan.pairs.length ? plan : null
}

// the file functions pack runs a group's files with
export async function loadFileFns(shell: Sh): Promise<string> {
  return await shell.fileLoad([FILE_KEY, FILE_KEY], import.meta.resolve, ['..'])
}

async function execOp(shell: Sh, context: Ctx, environment: Env, op: string) {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  let _shell = shell
  const filters = environment.getSplit(FILE_OP_PARTS_KEY(op))
  const content = await loadSync()
  const sysOsPlat = context.sys_os_plat

  const validKeys: Array<string> = []
  for (
    const key of Object.keys(content).filter((k) =>
      !filters.length ||
      filters.every((f) => {
        // a key is the one name a tool goes by. the acting ops take it whole; find, list and outdated read, so they
        // take the start of a word, and look further, into the paths the tool's files come from
        return op === 'find' || op === 'list' || op === 'outdated'
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
    .with(await _shell.fileLoad(['lock'], import.meta.resolve, ['..']))
    .with(await loadFileFns(_shell))

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
    const plan: FilePlan = { pairs: [], dirs: [], perms: [] }
    for (const key of validKeys) {
      const one = await keyPlan(_shell, context, key, content[key])
      plan.pairs.push(...one.pairs)
      plan.dirs.push(...one.dirs)
      plan.perms.push(...one.perms)
    }
    _shell = _shell
      .with(_shell.varSetArr(FILE_OP_PATH_PAIRS_KEY(op), plan.pairs))
      .with(_shell.varSetArr(FILE_OP_DIRS_KEY(op), plan.dirs))
      .with(_shell.varSetArr(FILE_OP_PATH_PERMS_KEY(op), plan.perms))
  }

  _shell = _shell.with(_shell.varSetStr(FILE_OP_KEY, op))
  // outdated, sync and remove ask which tools, then act on those: outdated and sync fetch every source, and sync and
  // remove write. find and list only read what the server sent and what is on disk, so there is nothing to gate
  const gated = op === 'outdated' || op === 'sync' || op === 'remove'
  const run = gated
    ? [
      `if not (filePlanShow '${shellEnvKey(FILE_OP_PATH_PAIRS_KEY(op))}' '${shellEnvKey(FILE_OP_DIRS_KEY(op))}' '${
        shellEnvKey(FILE_OP_TOOLS_KEY(op))
      }') {`,
      '  return',
      '}',
      FILE_KEY,
    ]
    : [FILE_KEY]
  _shell = _shell.with(op === 'sync' || op === 'remove' ? lockRun(_shell, `${FILE_KEY} ${op}`, run) : run)

  const body = _shell.build()

  if (environment.get(['log'])) {
    console.log(body)
  }

  return body
}

export class FileCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi', 'se', 'search']
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

export class FileCmdOutdated extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'outdated'
    this.description = 'list what sync would write on local'
    this.aliases = ['o', 'ou', 'out', 'stale']
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

export class FileCmdRemove extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'remove'
    this.description = 'remove on local what sync wrote'
    this.aliases = ['r', 'rm', 'rem', 'un', 'unin', 'uninstall']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match', required: true }]
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
    this.description = 'sync from remote: write only what changed'
    this.aliases = ['s', 'sy', 'up', 'update']
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
