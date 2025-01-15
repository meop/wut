import type { Virt } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { log } from '../../log.ts'

import { Tool } from '../../tool.ts'

export class Docker extends Tool implements Virt {
  program = 'docker'

  async down(names?: Array<string>) {
    for (const fsPath of await this._fsPaths(names)) {
      await this.shell(`compose --file ${fsPath} down`)
    }
  }
  async list(names?: Array<string>) {
    for (const fsPath of await this._fsPaths(names, true)) {
      log(fsPath)
    }
  }
  async stat(names?: Array<string>) {
    await this.shell('ps -a', names)
  }
  async tidy() {
    await this.shell('system prune --all --volumes')
  }
  async up(names?: Array<string>) {
    for (const fsPath of await this._fsPaths(names)) {
      await this.shell(`compose --file ${fsPath} pull`)
      await this.shell(`compose --file ${fsPath} up --detach`)
    }
  }

  constructor(shellOpts?: ShellOpts) {
    super('docker', shellOpts)
  }
}
