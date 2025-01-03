import type { Pack } from '../pack.i.ts'

import { runShell } from '../../shell.ts'

export class Dnf implements Pack {
  program = 'dnf'
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
    await this.shell(`${this.program} check-update`)
    await this.shell(`${this.program} install ${options.names.join(' ')}`)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} remove ${options.names.join(' ')}`)
  }
  async find(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} check-update`)
    for (const name of options.names) {
      await this.shell(`${this.program} search ${name}`)
    }
  }
  async list(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} list --installed`, options.names)
  }
  async out(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} check-update`)
    await this.shell(`${this.program} list --upgrades`, options.names)
  }
  async tidy(): Promise<void> {
    await this.shell(`${this.program} clean dbcache`)
    await this.shell(`${this.program} autoremove`)
  }
  async up(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} check-update`)
    await this.shell(
      `${this.program} ` +
        (options.names.length > 0
          ? `upgrade ${options.names.join(' ')}`
          : 'distro-sync'),
    )
  }

  constructor(cmdOptions?: Record<string, any>) {
    this.cmdOptions = cmdOptions ?? {}
  }
}
