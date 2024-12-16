import type { Pack } from '../pack.i.ts'

import { filterShell, spawnShell } from '../../shell.ts'

export class Brew implements Pack {
  async getProgram(): Promise<string> {
    return 'brew'
  }

  async add(options: { names: Array<string> }): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
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
  async list(options: { names: Array<string> | undefined }): Promise<void> {
    await filterShell(`${await this.getProgram()} list`, options.names)
  }
  async out(options: { names: Array<string> | undefined }): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
    await filterShell(`${await this.getProgram()} outdated`, options.names)
  }
  async tidy(): Promise<void> {
    await spawnShell(`${await this.getProgram()} cleanup --prune=all`)
  }
  async up(options: { names: Array<string> | undefined }): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
    const filter =
      (options.names?.length ?? 0) > 0 ? ` ${options.names!.join(' ')}` : ''
    await spawnShell(`${await this.getProgram()} upgrade --greedy` + filter)
  }
}
