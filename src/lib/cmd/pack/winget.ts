import type { Pack } from '../pack.i.ts'

import { filterShell, spawnShell } from '../../shell.ts'

export class WinGet implements Pack {
  program = 'winget'

  async add(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${this.program} install` + filter)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${this.program} uninstall` + filter)
  }
  async find(options: { name: string }): Promise<void> {
    const filter = ` ${options.name}`
    await spawnShell(`${this.program} search` + filter)
  }
  async list(options: { names?: Array<string> | undefined }): Promise<void> {
    await filterShell(`${this.program} list`, options.names)
  }
  async out(options: { names: Array<string> | undefined }): Promise<void> {
    await filterShell(`${this.program} upgrade`, options.names)
  }
  async tidy(): Promise<void> {}
  async up(options: { names: Array<string> | undefined }): Promise<void> {
    const filter =
      (options.names?.length ?? 0) > 0
        ? ` ${options.names!.join(' ')} `
        : ' --all'
    await spawnShell(`${this.program} upgrade` + filter)
  }
}
