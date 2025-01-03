import type { Pack } from '../pack.i.ts'

import { runShell } from '../../shell.ts'

export class Scoop implements Pack {
  program = 'scoop'
  asRoot = false
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
    await this.shell(`${this.program} uninstall ${options.names.join(' ')}`)
  }
  async find(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    for (const name of options.names) {
      await this.shell(`${this.program} search ${name}`)
    }
  }
  async list(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} list`, options.names)
  }
  async old(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    await this.shell(`${this.program} status`, options.names)
  }
  async tidy(): Promise<void> {
    await this.shell(`${this.program} cleanup --all --cache`)
  }
  async up(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    await this.shell(
      `${this.program} update ` +
        (options.names.length > 0 ? `${options.names.join(' ')}` : '--all'),
    )
  }

  constructor(cmdOptions?: Record<string, any>) {
    this.cmdOptions = cmdOptions ?? {}
  }
}
