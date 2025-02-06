import { promises as fsPromises } from 'node:fs'
import path from 'node:path'

import { logInfo } from './log'
import { getPlat } from './os'
import { type ShellOpts, shellRun } from './sh'

export type PathItemPermission = {
  read?: boolean
  write?: boolean
  execute?: boolean
}

export type PathPermission = {
  user?: PathItemPermission
  group?: PathItemPermission
  other?: PathItemPermission
}

export function fmtPath(p: string) {
  return p
    .replaceAll(path.posix.sep, path.sep)
    .replaceAll(path.win32.sep, path.sep)
}

export async function getPathContents(p: string) {
  return await fsPromises.readFile(fmtPath(p), 'utf8')
}

export async function getPathStat(p: string) {
  try {
    return await fsPromises.stat(fmtPath(p))
  } catch {
    return undefined
  }
}

export function getPlatDiffCmd(plat: string, lPath: string, rPath: string) {
  switch (plat) {
    case 'linux':
    case 'macos':
      return `diff "${fmtPath(lPath)}" "${fmtPath(rPath)}"`
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

function getFsScopeVal(permItem?: PathItemPermission) {
  let val = 0
  if (permItem?.read) {
    val += 4
  }
  if (permItem?.write) {
    val += 2
  }
  if (permItem?.execute) {
    val += 1
  }
  return val
}

function getFsModVal(perm: PathPermission) {
  return `${getFsScopeVal(perm.user)}${getFsScopeVal(perm.group)}${getFsScopeVal(perm.other)}`
}

export function getPlatPermCmd(plat: string, perm: PathPermission) {
  switch (plat) {
    case 'linux':
    case 'macos':
      return `chmod ${getFsModVal(perm)}`
    case 'windows':
      return ''
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}

export async function ensureDirPath(
  dirPath: string,
  shellOpts?: ShellOpts,
  makeEmpty?: boolean,
) {
  const fmtDirPath = fmtPath(dirPath)

  const fsStat = await getPathStat(fmtDirPath)
  if (!fsStat || fsStat.isFile() || makeEmpty) {
    if (shellOpts?.verbose) {
      logInfo(`reset: '${fmtDirPath}'`)
    }
    if (!shellOpts?.dryRun) {
      if (fsStat) {
        await fsPromises.rm(fmtDirPath, { recursive: true })
      }
      await fsPromises.mkdir(fmtDirPath, { recursive: true })
    }
  }
}

export async function syncFilePath(
  sourcePath: string,
  targetPath: string,
  targetPerm?: PathPermission,
  shellOpts?: ShellOpts,
) {
  const fmtSourcePath = fmtPath(sourcePath)
  const fmtTargetPath = fmtPath(targetPath)

  if (!(await getPathStat(sourcePath))) {
    return
  }

  logInfo(`copy: '${fmtSourcePath}' | to: '${fmtTargetPath}'`)
  if (!shellOpts?.dryRun) {
    await ensureDirPath(path.dirname(targetPath))
    await fsPromises.copyFile(fmtSourcePath, fmtTargetPath)
  }

  if (targetPerm) {
    const cmd = getPlatPermCmd(getPlat(), targetPerm)
    if (cmd) {
      const fullCmd = `${cmd} ${fmtTargetPath}`
      await shellRun(fullCmd, shellOpts)
    }
  }
}

export async function getFilePathsInPath(fsPath: string) {
  const fmtFsPath = fmtPath(fsPath)

  const filePaths: Array<string> = []

  const stat = await getPathStat(fmtFsPath)
  if (!stat) {
    return filePaths
  }

  if (stat.isDirectory()) {
    for (const fsSubPath of await fsPromises.readdir(fmtFsPath)) {
      filePaths.push(
        ...(await getFilePathsInPath(path.join(fmtFsPath, fmtPath(fsSubPath)))),
      )
    }
  } else {
    filePaths.push(fmtFsPath)
  }

  return filePaths
}

export async function isInPath(prog: string, shellOpts?: ShellOpts) {
  try {
    const cmd = getPlatFindCmd(getPlat(), prog)
    await shellRun(cmd, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
      throwOnExitCode: true,
    })
    return true
  } catch {
    return false
  }
}
