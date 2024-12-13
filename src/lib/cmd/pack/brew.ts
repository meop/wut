import type { Pack } from '../pack.i.ts'

import { filterShell, spawnShell } from '../../shell.ts'

const program = { name: 'brew', sudo: false }

export class Brew implements Pack {
  async add(options: { names: Array<string> }): Promise<void> {
    await spawnShell(`${program.name} update`)
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${program.name} install` + filter)
  }
  async del(options: { names: Array<string> }): Promise<void> {
    const filter = ` ${options.names.join(' ')}`
    await spawnShell(`${program.name} uninstall` + filter)
  }
  async find(options: { name: string }): Promise<void> {
    const filter = ` ${options.name}`
    await spawnShell(`${program.name} search` + filter)
  }
  async list(options: { name?: string }): Promise<void> {
    await filterShell(`${program.name} list`, options.name)
  }
  async out(options: { name?: string }): Promise<void> {
    await spawnShell(`${program.name} update`)
    await filterShell(`${program.name} outdated`, options.name)
  }
  async tidy(options: {}): Promise<void> {
    await spawnShell(`${program.name} cleanup --prune=all`)
  }
  async up(options: { names?: Array<string> }): Promise<void> {
    await spawnShell(`${program.name} update`)
    const filter = options.names ? ` ${options.names.join(' ')}` : ''
    await spawnShell(`${program.name} upgrade --greedy` + filter)
  }
}
