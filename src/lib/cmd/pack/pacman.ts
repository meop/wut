import type { Pack } from '../pack.i.ts'

import { runShell } from '../../shell.ts'

export class Pacman implements Pack {
  program = 'pacman'
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
    await this.shell(`${this.program} --sync --refresh`)
    await this.shell(`${this.program} --sync ${options.names.join(' ')}`)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    await this.shell(
      `${this.program} --remove --recursive --nosave ${options.names.join(
        ' ',
      )}`,
    )
  }
  async find(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} --sync --refresh`)
    for (const name of options.names) {
      await this.shell(`${this.program} --query --search ${name}`)
    }
  }
  async list(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} --query`, options.names)
  }
  async out(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} --sync --refresh`)
    await this.shell(`${this.program} --query --upgrades`, options.names)
  }
  async tidy(): Promise<void> {
    await this.shell(`${this.program} --sync --clean`)
  }
  async up(options: { names: Array<string> }): Promise<void> {
    await this.shell(`${this.program} --sync --refresh`)
    if (options.names.length > 0) {
      await this.shell(`${this.program} --sync ${options.names.join(' ')}`)
    } else {
      await this.shell(`${this.program} --sync --sysupgrade`)
    }
  }

  constructor(cmdOptions?: Record<string, any>) {
    this.cmdOptions = cmdOptions ?? {}
  }
}

export class Yay extends Pacman {
  program = 'yay'
  asRoot = false

  constructor(cmdOptions?: Record<string, any>) {
    super(cmdOptions)
  }
}
