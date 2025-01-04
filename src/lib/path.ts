import { getPlatform } from './os.ts'
import { runShell } from './shell.ts'

const platformToFindCmd = {
  linux: 'which',
  macos: 'which',
  windows: 'where',
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
