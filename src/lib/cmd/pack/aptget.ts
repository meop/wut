import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { shellRun } from '../../shell.ts'

export class AptGet implements Pack {
  program = 'sudo apt-get'
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async add(names: Array<string>) {
    await this.shell('update')
    await this.shell(`install ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`purge ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    await this.shell('update')
    for (const name of names) {
      await this.shell(
        `${this.program.replace('apt-get', 'apt-cache')} search ${name}`,
      )
    }
  }
  async list(names: Array<string>) {
    await this.shell('list --installed', names)
  }
  async out(names: Array<string>) {
    await this.shell(`update`)
    await this.shell('list --upgradable', names)
  }
  async tidy() {
    await this.shell('autoclean')
    await this.shell('autoremove')
  }
  async up(
    names: Array<string>,
    upgradeCmd: string = 'dist-upgrade',
  ) {
    await this.shell('update')
    await this.shell(
      names.length > 0 ? `install ${names.join(' ')}` : upgradeCmd,
    )
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}

export class Apt extends AptGet {
  program = 'sudo apt'

  async up(names: Array<string>) {
    await super.up(names, 'full-upgrade')
  }

  constructor(shellOpts?: ShellOpts) {
    super(shellOpts)
  }
}
