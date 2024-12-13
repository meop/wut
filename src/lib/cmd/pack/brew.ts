import type { Pack } from '../pack.i.ts'

import { filterShell, spawnShell } from '../../shell.ts'

export class Brew implements Pack {
  program = 'brew'

  async add(options: { names: Array<string> }): Promise<void> {
    await spawnShell(`${this.program} update`)
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
  async list(options: { names: Array<string> | undefined }): Promise<void> {
    await filterShell(`${this.program} list`, options.names)
  }
  async out(options: { names: Array<string> | undefined }): Promise<void> {
    await spawnShell(`${this.program} update`)
    await filterShell(`${this.program} outdated`, options.names)
  }
  async tidy(): Promise<void> {
    await spawnShell(`${this.program} cleanup --prune=all`)
  }
  async up(options: { names: Array<string> | undefined }): Promise<void> {
    await spawnShell(`${this.program} update`)
    const filter =
      (options.names?.length ?? 0) > 0 ? ` ${options.names!.join(' ')}` : ''
    await spawnShell(`${this.program} upgrade --greedy` + filter)
  }
}
