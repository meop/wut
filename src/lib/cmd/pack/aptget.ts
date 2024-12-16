import type { Pack } from '../pack.i.ts'

import { isInPath } from '../../path.ts'
import { filterShell, spawnShell } from '../../shell.ts'

export class AptGet implements Pack {
  async getProgram(): Promise<string> {
    return ((await isInPath('sudo')) ? 'sudo ' : '') + 'apt-get'
  }

  async add(options: { names: Array<string> }): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${await this.getProgram()} install` + filter)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${await this.getProgram()} purge` + filter)
    await spawnShell(`${await this.getProgram()} autoremove`)
  }
  async find(options: { name: string }): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
    const filter = ` ${options.name}`
    await spawnShell(
      `${(await this.getProgram()).replace('apt-get', 'apt-cache')} search` +
        filter,
    )
  }
  async list(options: { names: Array<string> }): Promise<void> {
    await filterShell(
      `${await this.getProgram()} list --installed`,
      options.names,
    )
  }
  async out(options: { names: Array<string> }): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
    await filterShell(
      `${await this.getProgram()} list --upgradeable`,
      options.names,
    )
  }
  async tidy(): Promise<void> {
    await spawnShell(`${await this.getProgram()} autoclean`)
  }
  async up(
    options: { names: Array<string> },
    upgradeCmd: string = 'dist-upgrade',
  ): Promise<void> {
    await spawnShell(`${await this.getProgram()} update`)
    if (options.names.length > 0) {
      const filter = ` ${options.names.join(' ')}`
      await spawnShell(`${await this.getProgram()} install` + filter)
    } else {
      await spawnShell(`${await this.getProgram()} ${upgradeCmd}`)
    }
  }
}

export class Apt extends AptGet {
  async getProgram(): Promise<string> {
    return ((await isInPath('sudo')) ? 'sudo ' : '') + 'apt'
  }

  async up(options: { names: Array<string> }): Promise<void> {
    await super.up(options, 'full-upgrade')
  }
}
