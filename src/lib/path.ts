import { getPlatform } from './os.ts'
import { execShell } from './shell.ts'

const platformToFindCmd = {
  linux: 'which',
  macos: 'which',
  windows: 'where',
}

export async function isInPath(program: string): Promise<boolean> {
  try {
    await execShell(`${platformToFindCmd[getPlatform()]} ${program}`)
    return true
  } catch {
    return false
  }
}
