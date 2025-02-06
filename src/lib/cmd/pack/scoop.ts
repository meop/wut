import type { Pack } from '../../cmd'
import type { ShellOpts } from '../../sh'
import { Tool } from '../../tool'

export class Scoop extends Tool implements Pack {
  async add(names: Array<string>) {
    await this.shell('update')
    await this.shell(`install ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`uninstall ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    await this.shell('update')
    for (const name of names) {
      await this.shell(`search ${name}`)
    }
  }
  async list(names?: Array<string>) {
    await this.shell('list', names)
  }
  async out(names?: Array<string>) {
    await this.shell('update')
    await this.shell('status', names)
  }
  async tidy() {
    await this.shell('cleanup --all --cache')
  }
  async up(names?: Array<string>) {
    await this.shell('update')
    await this.shell(
      `update${(names?.length ?? 0) > 0 ? ` ${names?.join(' ')}` : ' --all'}`,
    )
  }

  constructor(shellOpts?: ShellOpts) {
    super('scoop', '', shellOpts)
  }
}
