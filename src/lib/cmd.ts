import { Command } from 'commander'

import { logError } from './log'

export function buildCmd(name: string, description: string, command?: Command) {
  return (command || new Command())
    .name(name)
    .description(description)
    .helpCommand(false)
}

// biome-ignore lint/suspicious/noExplicitAny: generic decorator
export function buildAction(func: (...args: Array<any>) => Promise<void>) {
  // biome-ignore lint/suspicious/noExplicitAny: generic decorator
  return async (...args: Array<any>) => {
    try {
      await func(...args)
    } catch (err) {
      if (err.message) {
        logError(String(err.message))
      }
    }
  }
}

export type CmdOpts = {
  dryRun?: boolean
  verbose?: boolean
}

export interface Dot {
  diff: (names?: Array<string>) => Promise<void>
  list: (names?: Array<string>) => Promise<void>
  pull: (names?: Array<string>) => Promise<void>
  push: (names?: Array<string>) => Promise<void>
}

export interface Pack {
  add: (names: Array<string>) => Promise<void>
  del: (names: Array<string>) => Promise<void>
  find: (names: Array<string>) => Promise<void>
  list: (names?: Array<string>) => Promise<void>
  out: (names?: Array<string>) => Promise<void>
  tidy: () => Promise<void>
  up: (names?: Array<string>) => Promise<void>
}

export interface Strap {
  list: (names?: Array<string>) => Promise<void>
  run: (names: Array<string>) => Promise<void>
}

export interface Virt {
  down: (names?: Array<string>) => Promise<void>
  list: (names?: Array<string>) => Promise<void>
  stat: (names?: Array<string>) => Promise<void>
  tidy: () => Promise<void>
  up: (names?: Array<string>) => Promise<void>
}
