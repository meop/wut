import type { Pack } from '../pack.i.ts'

import { runShell } from '../../shell.ts'

export class Brew implements Pack {
  program = 'brew'
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

  async add(
    options: { names: Array<string> },
    cask: boolean = false,
  ): Promise<void> {
    await this.shell(`${this.program} update`)
    await this.shell(
      `${this.program} install${cask ? ' --cask' : ''} ${options.names.join(
        ' ',
      )}`,
    )
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
    await this.shell(`${this.program} update`)
    await this.shell(`${this.program} outdated`, options.names)
  }
  async repo(options: { names: Array<string> }): Promise<void> {
    for (const name of options.names) {
      await this.shell(`${this.program} tap ${name}`)
    }
  }
  async tidy(): Promise<void> {
    await this.shell(`${this.program} cleanup --prune=all`)
  }
  async up(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} update`)
    await this.shell(
      `${this.program} upgrade --greedy` +
      (options.names?.length > 0 ? ` ${options.names.join(' ')}` : ''),
    )
  }

  constructor(cmdOptions?: Record<string, any>) {
    this.cmdOptions = cmdOptions ?? {}
  }
}
