import type { Pack } from '../../cmd'
import type { ShOpts } from '../../sh'
import { Tool } from '../../tool'

export class Brew extends Tool implements Pack {
  async add(names: Array<string>, cask = false) {
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
      `upgrade --greedy${names?.length ? ` ${names.join(' ')}` : ''}`,
    )
  }

  constructor(shOpts?: ShOpts) {
    super('brew', '', shOpts)
  }
}
