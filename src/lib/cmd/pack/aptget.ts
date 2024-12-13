import type { Pack } from '../pack.i.ts'

import { filterShell, spawnShell } from '../../shell.ts'

export class AptGet implements Pack {
  program = 'sudo apt-get'

  async add(options: { names: Array<string> }): Promise<void> {
    await spawnShell(`${this.program} update`)
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${this.program} install` + filter)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${this.program} purge` + filter)
    await spawnShell(`${this.program} autoremove`)
  }
  async find(options: { name: string }): Promise<void> {
    await spawnShell(`${this.program} update`)
    const filter = ` ${options.name}`
    await spawnShell(
      `${this.program.replace('apt-get', 'apt-cache')} search` + filter,
    )
  }
  async list(options: { name?: string }): Promise<void> {
    await filterShell(`${this.program} list --installed`, options.name)
  }
  async out(options: { name?: string }): Promise<void> {
    await spawnShell(`${this.program} update`)
    await filterShell(`${this.program} list --upgradeable`, options.name)
  }
  async tidy(options: {}): Promise<void> {
    await spawnShell(`${this.program} autoclean`)
  }
  async up(
    options: { names?: Array<string> },
    upgradeCmd: string = 'dist-upgrade',
  ): Promise<void> {
    await spawnShell(`${this.program} update`)
    if (options.names?.length ?? 0 > 0) {
      const filter = ` ${options.names!.join(' ')}`
      await spawnShell(`${this.program} install` + filter)
    } else {
      await spawnShell(`${this.program} ${upgradeCmd}`)
    }
  }
}

export class Apt extends AptGet {
  program = 'sudo apt'

  async up(options: { names?: Array<string> }): Promise<void> {
    await super.up(options, 'full-upgrade')
  }
}
