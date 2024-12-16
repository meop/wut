import type { Pack } from '../pack.i.ts'

import { filterShell, spawnShell } from '../../shell.ts'

export class WinGet implements Pack {
  async getProgram(): Promise<string> {
    return 'winget'
  }

  async add(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${await this.getProgram()} install` + filter)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${await this.getProgram()} uninstall` + filter)
  }
  async find(options: { name: string }): Promise<void> {
    const filter = ` ${options.name}`
    await spawnShell(`${await this.getProgram()} search` + filter)
  }
  async list(options: { names?: Array<string> | undefined }): Promise<void> {
    await filterShell(`${await this.getProgram()} list`, options.names)
  }
  async out(options: { names: Array<string> | undefined }): Promise<void> {
    await filterShell(`${await this.getProgram()} upgrade`, options.names)
  }
  async tidy(): Promise<void> {}
  async up(options: { names: Array<string> | undefined }): Promise<void> {
    const filter =
      (options.names?.length ?? 0) > 0
        ? ` ${options.names!.join(' ')} `
        : ' --all'
    await spawnShell(`${await this.getProgram()} upgrade` + filter)
  }
}
