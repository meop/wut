import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { shellRun } from '../../shell.ts'

export class Dnf implements Pack {
  program = 'sudo dnf'
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async add(names: Array<string>) {
    await this.shell('check-update')
    await this.shell(`install ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`remove ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    await this.shell('check-update')
    for (const name of names) {
      await this.shell(`search ${name}`)
    }
  }
  async list(names: Array<string>) {
    await this.shell('list --installed', names)
  }
  async out(names: Array<string>) {
    await this.shell('check-update')
    await this.shell('list --upgrades', names)
  }
  async tidy() {
    await this.shell('clean dbcache')
    await this.shell('autoremove')
  }
  async up(names: Array<string>) {
    await this.shell('check-update')
    await this.shell(
      names.length > 0 ? `upgrade ${names.join(' ')}` : 'distro-sync',
    )
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
