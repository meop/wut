import type { Virt } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { basename } from 'path'

import { shellRun } from '../../shell.ts'

export class Docker implements Virt {
  program = 'docker'
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async down(fsPaths: Array<string>) {
    for (const fsPath of fsPaths) {
      await this.shell(`compose --file ${fsPath} down`)
    }
  }
  async stat(fsPaths: Array<string>) {
    const filters: Array<string> = []
    for (const fsPath of fsPaths) {
      filters.push(basename(fsPath, '.yaml'))
    }
    await this.shell('ps -a', filters)
  }
  async tidy() {
    await this.shell('system prune --all --volumes')
  }
  async up(fsPaths: Array<string>) {
    for (const fsPath of fsPaths) {
      await this.shell(`compose --file ${fsPath} pull`)
      await this.shell(`compose --file ${fsPath} up --detach`)
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
