import { promises as fsPromises } from 'fs'

import { getPlatform } from './os.ts'
import { runShell } from './shell.ts'

const platformToFindCmd = {
  linux: 'which',
  macos: 'which',
  windows: 'where',
}

export async function doesPathExist(filePath: string): Promise<boolean> {
  return await fsPromises
    .stat(filePath)
    .then(
      () => true,
      () => false,
    )
    .catch(() => false)
}

export async function isInPath(
  program: string,
  verbose?: boolean,
): Promise<boolean> {
  try {
    await runShell(`${platformToFindCmd[getPlatform()]} ${program}`, {
      throwOnExitCode: true,
      verbose,
    })
    return true
  } catch {
    return false
  }
}
