import type { Pack } from '../pack.i.ts'

import { runShell } from '../../shell.ts'

export class WinGet implements Pack {
  program = 'winget'
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
    await this.shell(`${this.program} install ${options.names.join(' ')}`)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} uninstall ${options.names.join(' ')}`)
  }
  async find(options: { names: Array<string> }): Promise<void> {
    for (const name of options.names) {
      await this.shell(`${this.program} search ${name}`)
    }
  }
  async list(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} list`, options.names)
  }
  async out(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} upgrade`, options.names)
  }
  async tidy(): Promise<void> {}
  async up(options: { names: Array<string> }): Promise<void> {
    await this.shell(
      `${this.program} upgrade ` +
        (options.names.length > 0 ? `${options.names.join(' ')}` : '--all'),
    )
  }

  constructor(cmdOptions?: Record<string, any>) {
    this.cmdOptions = cmdOptions ?? {}
  }
}
