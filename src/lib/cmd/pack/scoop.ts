import type { Pack } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { shellRun } from '../../shell.ts'

export class Scoop implements Pack {
  program = 'scoop'
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
      'update' + ((names?.length ?? 0) > 0 ? ` ${names!.join(' ')}` : ' --all'),
    )
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
