import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { Tool } from '../../tool.ts'

export class Brew extends Tool implements Pack {
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
  async list(names?: Array<string>) {
    await this.shell('list', names)
  }
  async out(names?: Array<string>) {
    await this.shell('update')
    await this.shell('outdated', names)
  }
  async tidy() {
    await this.shell('cleanup --prune=all')
  }
  async up(names?: Array<string>) {
    await this.shell('update')
    await this.shell(
      'upgrade --greedy' +
        ((names?.length ?? 0) > 0 ? ` ${names!.join(' ')}` : ''),
    )
  }

  constructor(shellOpts?: ShellOpts) {
    super('brew', shellOpts)
  }
}
