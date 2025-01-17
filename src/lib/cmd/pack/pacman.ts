import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { Tool } from '../../tool.ts'

export class Pacman extends Tool implements Pack {
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
      await this.shell(`--sync --search ${name}`)
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

  constructor(shellOpts?: ShellOpts, program?: string) {
    super(program ?? 'sudo pacman', shellOpts)
  }
}

export class Yay extends Pacman {
  constructor(shellOpts?: ShellOpts) {
    super(shellOpts, 'yay')
  }
}
