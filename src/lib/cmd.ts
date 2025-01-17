import { Command } from 'commander'

import { logError } from './log.ts'

export function buildCmd(name: string, description: string, command?: Command) {
  return (command || new Command())
    .name(name)
    .description(description)
    .helpCommand(false)
}

export function buildAct(func: (...args: Array<any>) => Promise<any>) {
  return (...args: Array<any>) =>
    func(...args).catch((err) => logError(err.message))
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

export interface Virt {
  down: (names?: Array<string>) => Promise<void>
  list: (names?: Array<string>) => Promise<void>
  stat: (names?: Array<string>) => Promise<void>
  tidy: () => Promise<void>
  up: (names?: Array<string>) => Promise<void>
}

export function getPlatDiffCmd(plat: string, lPath: string, rPath: string) {
  switch (plat) {
    case 'linux':
      return `diff "${lPath}" "${rPath}"`
    case 'macos':
      return `diff "${lPath}" "${rPath}"`
    case 'windows':
      return `fc "${lPath}" "${rPath}"`
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}

export function getPlatFindCmd(plat: string, program: string) {
  switch (plat) {
    case 'linux':
      return `which ${program}`
    case 'macos':
      return `which ${program}`
    case 'windows':
      return `where ${program}`
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}
