import type { ShellOpts } from './shell.ts'

import { promises as fsPromises } from 'fs'
import path from 'path'

import { log } from './log.ts'
import { getPlat } from './os.ts'
import { shellRun } from './shell.ts'

export function fmtPath(p: string) {
  return p
    .replaceAll(path.posix.sep, path.sep)
    .replaceAll(path.win32.sep, path.sep)
}

export async function getPathContents(p: string) {
  return await fsPromises.readFile(fmtPath(p), { encoding: 'utf8' })
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

export function getPlatFindCmd(plat: string, program: string) {
  switch (plat) {
    case 'linux':
    case 'macos':
      return `which ${program}`
    case 'windows':
      return `where.exe ${program}`
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
      log(`reset: ${fmtDirPath}`)
    }
    if (shellOpts?.dryRun) {
      return
    }
    if (fsStat) {
      await fsPromises.rm(fmtDirPath, { recursive: true })
    }
    await fsPromises.mkdir(fmtDirPath, { recursive: true })
  }
}

export async function syncFilePath(
  sourcePath: string,
  targetPath: string,
  shellOpts?: ShellOpts,
) {
  const fmtSourcePath = fmtPath(sourcePath)
  const fmtTargetPath = fmtPath(targetPath)

  if (!(await getPathStat(sourcePath))) {
    return
  }
  if (shellOpts?.verbose) {
    log(`copy: ${fmtSourcePath} to ${fmtTargetPath}`)
  }
  if (shellOpts?.dryRun) {
    return
  }
  await ensureDirPath(path.dirname(targetPath))
  await fsPromises.copyFile(fmtSourcePath, fmtTargetPath)
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

export async function isInPath(program: string, shellOpts?: ShellOpts) {
  try {
    const cmd = getPlatFindCmd(getPlat(), program)
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
