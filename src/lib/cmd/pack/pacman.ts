import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { shellRun } from '../../shell.ts'

export class Pacman implements Pack {
  program = 'sudo pacman'
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async add(names: Array<string>) {
    await this.shell('--sync --refresh')
    await this.shell(`--sync ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`--remove --recursive --nosave ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    await this.shell('--sync --refresh')
    for (const name of names) {
      await this.shell(`--query --search ${name}`)
    }
  }
  async list(names?: Array<string>) {
    await this.shell('--query', names)
  }
  async out(names?: Array<string>) {
    await this.shell('--sync --refresh')
    await this.shell('--query --upgrades', names)
  }
  async tidy() {
    await this.shell('--sync --clean')
  }
  async up(names?: Array<string>) {
    await this.shell('--sync --refresh')
    await this.shell(
      '--sync' +
        ((names?.length ?? 0) > 0 ? ` ${names!.join(' ')}` : ' --sysupgrade'),
    )
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}

export class Yay extends Pacman {
  program = 'yay'

  constructor(shellOpts?: ShellOpts) {
    super(shellOpts)
  }
}
