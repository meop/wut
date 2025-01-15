import type { ShellOpts } from './shell.ts'

import { promises as fsPromises } from 'fs'
import path from 'path'

import { getPlatFindCmd } from './cmd.ts'
import { getPlat } from './os.ts'
import { shellRun } from './shell.ts'

export async function doesPathExist(fsPath: string) {
  return await fsPromises
    .stat(fsPath)
    .then(
      () => true,
      () => false,
    )
    .catch(() => false)
}

export async function makePathExist(fsPath: string, shellOpts?: ShellOpts) {
  if (await doesPathExist(fsPath)) {
    return
  }

  if (!shellOpts?.dryRun) {
    await fsPromises.mkdir(fsPath, { recursive: true })
  }
}

export async function getFilePathsInDirPath(dirPath: string) {
  const filePaths: Array<string> = []

  if (!(await doesPathExist(dirPath))) {
    return filePaths
  }

  for (const dirent of await fsPromises.readdir(dirPath, { withFileTypes: true })) {
    const r = path.resolve(dirPath, dirent.name)
    const paths = dirent.isDirectory() ? await getFilePathsInDirPath(r) : [r]
    filePaths.push(...paths)
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
