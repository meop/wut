import type { ShellOpts } from './shell.ts'

import { promises as fsPromises } from 'fs'
import path from 'path'

import { getPlatFindCmd } from './cmd.ts'
import { log } from './log.ts'
import { getPlat } from './os.ts'
import { shellRun } from './shell.ts'

export async function getPathStat(fsPath: string) {
  try {
    return await fsPromises.stat(fsPath)
  } catch {
    return undefined
  }
}

export async function ensureDirPath(
  dirPath: string,
  shellOpts?: ShellOpts,
  makeEmpty?: boolean,
) {
  const fsStat = await getPathStat(dirPath)
  if (!fsStat || fsStat.isFile() || makeEmpty) {
    if (shellOpts?.verbose) {
      log(`reset: ${dirPath}`)
    }
    if (shellOpts?.dryRun) {
      return
    }
    if (fsStat) {
      await fsPromises.rm(dirPath, { recursive: true })
    }
    await fsPromises.mkdir(dirPath, { recursive: true })
  }
}

export async function syncFilePath(
  sourcePath: string,
  targetPath: string,
  shellOpts?: ShellOpts,
) {
  if (!(await getPathStat(sourcePath))) {
    return
  }
  if (shellOpts?.verbose) {
    log(`copy: ${sourcePath} to ${targetPath}`)
  }
  if (shellOpts?.dryRun) {
    return
  }
  await fsPromises.copyFile(sourcePath, targetPath)
}

export async function getFilePathsInPath(fsPath: string) {
  const filePaths: Array<string> = []

  const stat = await getPathStat(fsPath)
  if (!stat) {
    return filePaths
  }

  if (stat.isDirectory()) {
    for (const fsSubPath of await fsPromises.readdir(fsPath)) {
      filePaths.push(
        ...(await getFilePathsInPath(path.join(fsPath, fsSubPath))),
      )
    }
  } else {
    filePaths.push(fsPath)
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
