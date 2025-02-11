import type { Pack } from '../../cmd'
import type { ShellOpts } from '../../sh'
import { Tool } from '../../tool'

export class AptGet extends Tool implements Pack {
  async add(names: Array<string>) {
    await this.shell('update')
    await this.shell(`install ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`purge ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    await this.shell('update')
    this.program = this.program.replace('apt-get', 'apt-cache')
    for (const name of names) {
      await this.shell(`search ${name}`)
    }
    this.program = this.program.replace('apt-cache', 'apt-get')
  }
  async list(names?: Array<string>) {
    await this.shell('list --installed', names)
  }
  async out(names?: Array<string>) {
    await this.shell('update')
    await this.shell('list --upgradable', names)
  }
  async tidy() {
    await this.shell('autoclean')
    await this.shell('autoremove')
  }
  async up(names?: Array<string>, upgradeCmd = 'dist-upgrade') {
    await this.shell('update')
    await this.shell(names?.length ? `install ${names.join(' ')}` : upgradeCmd)
  }

  constructor(shellOpts?: ShellOpts, program?: string, executor?: string) {
    super(program ?? 'apt-get', executor ?? 'sudo', shellOpts)
  }
}

export class Apt extends AptGet {
  async up(names?: Array<string>) {
    await super.up(names, 'full-upgrade')
  }

  constructor(shellOpts?: ShellOpts) {
    super(shellOpts, 'apt', 'sudo')
  }
}
