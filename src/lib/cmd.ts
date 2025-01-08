import { Command } from 'commander'

export function buildCmd(name: string, description: string, command?: Command) {
  return (command || new Command())
    .name(name)
    .description(description)
    .helpCommand(false)
}

export type CmdOpts = {
  dryRun?: boolean
  verbose?: boolean
}

export interface Dot {
  find: (names: Array<string>) => Promise<void>
  pull: (names: Array<string>) => Promise<void>
  push: (names: Array<string>) => Promise<void>
}

export interface Pack {
  add: (names: Array<string>) => Promise<void>
  del: (names: Array<string>) => Promise<void>
  find: (names: Array<string>) => Promise<void>
  list: (names: Array<string>) => Promise<void>
  out: (names: Array<string>) => Promise<void>
  tidy: () => Promise<void>
  up: (names: Array<string>) => Promise<void>
}

export interface Virt {
  down: (fsPaths: Array<string>) => Promise<void>
  stat: (fsPaths: Array<string>) => Promise<void>
  tidy: () => Promise<void>
  up: (fsPaths: Array<string>) => Promise<void>
}
