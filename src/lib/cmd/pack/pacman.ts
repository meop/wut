import type { Pack } from '../../cmd'
import type { ShellOpts } from '../../sh'
import { Tool } from '../../tool'

export class Pacman extends Tool implements Pack {
  async add(names: Array<string>) {
    await this.shell('--sync --refresh')
    await this.shell(`--sync --needed ${names.join(' ')}`)
  }
  async del(names: Array<string>) {
    await this.shell(`--remove --recursive --nosave ${names.join(' ')}`)
  }
  async find(names: Array<string>) {
    await this.shell('--sync --refresh')
    for (const name of names) {
      await this.shell(`--sync --search ${name}`)
    }
  }
  async list(names?: Array<string>) {
    await this.shell('--query', names)
  }
  async out(names?: Array<string>) {
    await this.shell('--sync --refresh')
    await this.shell('--query --upgrades', names)
  }
  async tidy() {
    await this.shell('--sync --clean')
  }
  async up(names?: Array<string>) {
    await this.shell('--sync --refresh')
    await this.shell(
      `--sync${names?.length ? ` ${names.join(' ')}` : ' --sysupgrade'}`,
    )
  }

  constructor(shellOpts?: ShellOpts, program?: string, executor?: string) {
    super(program ?? 'pacman', executor ?? 'sudo', shellOpts)
  }
}

export class Yay extends Pacman {
  constructor(shellOpts?: ShellOpts) {
    super(shellOpts, 'yay', '')
  }
}
