import type { Virt } from '../../cmd'
import { log } from '../../log'
import type { ShellOpts } from '../../sh'
import { Tool } from '../../tool'

export class Docker extends Tool implements Virt {
  program = 'docker'

  async down(names?: Array<string>) {
    for (const fsPath of await this.configFilePaths('virt', names)) {
      await this.shell(`compose --file ${fsPath} down`)
    }
  }
  async list(names?: Array<string>) {
    for (const fsPath of await this.configFilePaths('virt', names, true)) {
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
    for (const fsPath of await this.configFilePaths('virt', names)) {
      await this.shell(`compose --file ${fsPath} pull`)
      await this.shell(`compose --file ${fsPath} up --detach`)
    }
  }

  constructor(shellOpts?: ShellOpts) {
    super('docker', '', shellOpts)
  }
}
