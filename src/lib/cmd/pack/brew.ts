import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { shellRun } from '../../shell.ts'

export class Brew implements Pack {
  program = 'brew'
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async add(names: Array<string>, cask: boolean = false) {
    await this.shell('update')
    await this.shell(`install${cask ? ' --cask' : ''} ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`uninstall ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    for (const name of names) {
      await this.shell(`search ${name}`)
    }
  }
  async list(names: Array<string>) {
    await this.shell('list', names)
  }
  async out(names: Array<string>) {
    await this.shell('update')
    await this.shell('outdated', names)
  }
  async tidy() {
    await this.shell('cleanup --prune=all')
  }
  async up(names: Array<string>) {
    await this.shell('update')
    await this.shell(
      'upgrade --greedy' + (names.length > 0 ? ` ${names.join(' ')}` : ''),
    )
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
