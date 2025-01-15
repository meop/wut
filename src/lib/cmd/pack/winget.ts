import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { Tool } from '../../tool.ts'

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
      'upgrade' +
        ((names?.length ?? 0) > 0 ? ` ${names!.join(' ')}` : ' --all'),
    )
  }

  constructor(shellOpts?: ShellOpts) {
    super('winget', shellOpts)
  }
}
