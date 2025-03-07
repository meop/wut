import type { Pack } from '../../cmd'
import type { ShOpts } from '../../sh'
import { Tool } from '../../tool'

export class WinGet extends Tool implements Pack {
  async add(names: Array<string>) {
    await this.shell(`install ${names.join(' ')}`)
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
    await this.shell('upgrade', names)
  }
  async tidy() {}
  async up(names?: Array<string>) {
    await this.shell(
      `upgrade${names?.length ? ` ${names.join(' ')}` : ' --all'}`,
    )
  }

  constructor(shOpts?: ShOpts) {
    super('winget', '', shOpts)
  }
}
