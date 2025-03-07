import { promises as fs } from 'node:fs'
import path from 'node:path'

import { logInfo } from './log'
import { getPlat } from './os'
import { type ShOpts, shellRun } from './sh'

export type AclPermScope = {
  read?: boolean
  write?: boolean
  execute?: boolean
}

export type AclPerm = {
  user?: AclPermScope
  group?: AclPermScope
  other?: AclPermScope
}

export function fmtPath(p: string) {
  return p
    .replaceAll(path.posix.sep, path.sep)
    .replaceAll(path.win32.sep, path.sep)
}

export function splitPath(p: string) {
  return p.split(path.sep)
}

export async function getPathContents(p: string) {
  return await fs.readFile(fmtPath(p), 'utf8')
}

export async function getPathStat(p: string) {
  try {
    return await fs.stat(fmtPath(p))
  } catch {
    return undefined
  }
}

export function getPlatDiffCmd(plat: string, lPath: string, rPath: string) {
  switch (plat) {
    case 'linux':
    case 'macos':
      return `diff '${fmtPath(lPath)}' '${fmtPath(rPath)}'`
    case 'windows':
      return `fc.exe "${fmtPath(lPath)}" "${fmtPath(rPath)}"`
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}

export function getPlatFindCmd(plat: string, prog: string) {
  switch (plat) {
    case 'linux':
    case 'macos':
      return `which ${prog}`
    case 'windows':
      return `where.exe ${prog}`
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}

function getFsAclUnixSymVal(itemPerm?: AclPermScope) {
  let symbols = ''
  if (itemPerm?.read) {
    symbols += 'r'
  }
  if (itemPerm?.write) {
    symbols += 'w'
  }
  if (itemPerm?.execute) {
    symbols += 'x'
  }
  return symbols
}

function getFsAclUnixVal(perm: AclPerm) {
  const permBlocks: Array<string> = []
  permBlocks.push(`u=${getFsAclUnixSymVal(perm.user)}`)
  permBlocks.push(`g=${getFsAclUnixSymVal(perm.group)}`)
  permBlocks.push(`o=${getFsAclUnixSymVal(perm.other)}`)
  return permBlocks.join(',')
}

function getFsAclWinntSymVal(itemPerm?: AclPermScope) {
  const symbols: Array<string> = []
  if (itemPerm?.read) {
    symbols.push('gr')
  }
  if (itemPerm?.write) {
    symbols.push('gw')
  }
  if (itemPerm?.execute) {
    symbols.push('ge')
  }

  return symbols.join(',')
}

function getFsAclWinntVal(perm: AclPerm) {
  const permBlocks: Array<string> = []
  const userPerms = getFsAclWinntSymVal(perm.user)
  if (userPerms !== '') {
    permBlocks.push(`"${process.env.USER}:(${userPerms})"`)
  }
  const groupPerms = getFsAclWinntSymVal(perm.group)
  if (groupPerms !== '') {
    permBlocks.push(`"Administrators:(${groupPerms})"`)
  }
  const otherPerms = getFsAclWinntSymVal(perm.other)
  if (otherPerms !== '') {
    permBlocks.push(`"SYSTEM:(${otherPerms})"`)
  }
  return permBlocks.join(' ')
}

export function getPlatAclPermCmds(
  plat: string,
  fsPath: string,
  perm: AclPerm,
) {
  switch (plat) {
    case 'linux':
    case 'macos':
      return [`chmod -R a-s,${getFsAclUnixVal(perm)} '${fsPath}'`]
    case 'windows':
      return [
        `icacls.exe "${fsPath}" /t /reset`,
        `icacls.exe "${fsPath}" /t /inheritance:r /grant ${getFsAclWinntVal(perm)}`,
      ]
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}

export async function ensureDirPath(
  dirPath: string,
  shOpts?: ShOpts,
  makeEmpty?: boolean,
) {
  const fmtDirPath = fmtPath(dirPath)
  if (shOpts?.verbose) {
    logInfo(`ensure dir: '${fmtDirPath}' | make empty: ${makeEmpty ?? false}`)
  }

  const fsStat = await getPathStat(fmtDirPath)
  if (!fsStat || fsStat.isFile() || makeEmpty) {
    if (!shOpts?.dryRun) {
      if (fsStat) {
        await fs.rm(fmtDirPath, { recursive: true })
      }
      await fs.mkdir(fmtDirPath, { recursive: true })
    }
  }
}

export async function syncFilePath(
  sourcePath: string,
  targetPath: string,
  targetPerm?: AclPerm,
  shOpts?: ShOpts,
) {
  const fmtSourcePath = fmtPath(sourcePath)
  const fmtTargetPath = fmtPath(targetPath)

  if (!(await getPathStat(sourcePath))) {
    return
  }

  logInfo(`copy: '${fmtSourcePath}' | to: '${fmtTargetPath}'`)
  if (!shOpts?.dryRun) {
    await ensureDirPath(path.parse(targetPath).dir, shOpts)
    await fs.copyFile(fmtSourcePath, fmtTargetPath)
  }

  if (targetPerm) {
    const cmds = getPlatAclPermCmds(getPlat(), fmtTargetPath, targetPerm)
    for (const cmd of cmds) {
      await shellRun(cmd, { ...shOpts, verbose: true })
    }
  }
}

export function getFilePath(parts?: Array<string>) {
  return fmtPath(path.join(...(parts ?? [])))
}

export function getFilePaths(parts?: Array<string>, filters?: Array<string>) {
  return getFilePathsInPath(getFilePath(parts), filters)
}

export async function getFilePathsInPath(
  fsPath: string,
  filters?: Array<string>,
) {
  const fmtFsPath = fmtPath(fsPath)

  let filePaths: Array<string> = []

  const stat = await getPathStat(fmtFsPath)
  if (!stat) {
    return filePaths
  }

  if (stat.isDirectory()) {
    for (const fsSubPath of await fs.readdir(fmtFsPath)) {
      filePaths.push(
        ...(await getFilePathsInPath(path.join(fmtFsPath, fmtPath(fsSubPath)))),
      )
    }
  } else {
    filePaths.push(fmtFsPath)
  }

  if (filters) {
    filePaths = filePaths.filter(p =>
      filters?.every(f => p.toLowerCase().includes(f)),
    )
  }

  return filePaths
}

export async function isInPath(prog: string, shOpts?: ShOpts) {
  try {
    const cmd = getPlatFindCmd(getPlat(), prog)
    await shellRun(cmd, {
      ...shOpts,
      dryRun: false,
      pipeOutAndErr: true,
      throwOnExitCode: true,
    })
    return true
  } catch {
    return false
  }
}
