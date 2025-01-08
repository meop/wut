import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { shellRun } from '../../shell.ts'

export class WinGet implements Pack {
  program = 'winget'
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

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
  async list(names: Array<string>) {
    await this.shell('list', names)
  }
  async out(names: Array<string>) {
    await this.shell('upgrade', names)
  }
  async tidy() {}
  async up(names: Array<string>) {
    await this.shell(
      'upgrade' + (names.length > 0 ? ` ${names.join(' ')}` : ' --all'),
    )
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
