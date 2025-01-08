import type { ShellOpts } from './shell.ts'

import { promises as fsPromises } from 'fs'

import { getPlat } from './os.ts'
import { shellRun } from './shell.ts'
import path from 'path'

const platFindCmd = {
  linux: 'which',
  macos: 'which',
  windows: 'where',
}

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

export async function getFilePathsInDir(dir: string) {
  const filePaths: Array<string> = []

  for (const dirent of await fsPromises.readdir(dir, { withFileTypes: true })) {
    const res = path.resolve(dir, dirent.name)
    const paths = dirent.isDirectory() ? await getFilePathsInDir(res) : [res]
    filePaths.push(...paths)
  }

  return filePaths
}

export async function isInPath(program: string, shellOpts?: ShellOpts) {
  try {
    const cmd = platFindCmd[getPlat()]
    await shellRun(`${cmd} ${program}`, {
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
