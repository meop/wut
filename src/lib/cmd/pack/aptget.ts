import type { Pack } from '../pack.i.ts'

import { runShell } from '../../shell.ts'

export class AptGet implements Pack {
  program = 'apt-get'
  asRoot = true
  cmdOptions: Record<string, any>

  shell = (cmd: string, filter: Array<string> = []) => {
    return runShell(cmd, {
      asRoot: this.asRoot,
      dryRun: this.cmdOptions?.dryRun,
      filter,
      verbose: true,
    })
  }

  async add(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    await this.shell(`${this.program} install ${options.names.join(' ')}`)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} purge ${options.names.join(' ')}`)
    await this.shell(`${this.program} autoremove`)
  }
  async find(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    for (const name of options.names) {
      await this.shell(
        `${this.program.replace('apt-get', 'apt-cache')} search ${name}`,
      )
    }
  }
  async list(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} list --installed`, options.names)
  }
  async out(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    await this.shell(`${this.program} list --upgradeable`, options.names)
  }
  async tidy(): Promise<void> {
    await this.shell(`${this.program} autoclean`)
  }
  async up(
    options: { names: Array<string> },
    upgradeCmd: string = 'dist-upgrade',
  ): Promise<void> {
    await this.shell(`${this.program} update`)
    if (options.names.length > 0) {
      await this.shell(`${this.program} install ${options.names.join(' ')}`)
    } else {
      await this.shell(`${this.program} ${upgradeCmd}`)
    }
  }

  constructor(cmdOptions?: Record<string, any>) {
    this.cmdOptions = cmdOptions ?? {}
  }
}

export class Apt extends AptGet {
  program = 'apt'

  async up(options: { names: Array<string> }): Promise<void> {
    await super.up(options, 'full-upgrade')
  }

  constructor(cmdOptions?: Record<string, any>) {
    super(cmdOptions)
  }
}
