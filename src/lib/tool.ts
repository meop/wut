import type { ShellOpts } from './shell.ts'

import os from 'os'
import path from 'path'

import { findConfigFilePaths } from './config.ts'
import { shellRun } from './shell.ts'
import { isInPath } from './path.ts'

export class Tool {
  program: string
  executor: string
  shellOpts: ShellOpts

  shell = async (cmd: string, filters?: Array<string>) => {
    const executor = (this.executor && await isInPath(this.executor)) ? `${this.executor} ` : ''
    return shellRun(`${executor}${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async configFilePaths(category: string, names?: Array<string>, partialMatch: boolean = false) {
    let fsPaths = await findConfigFilePaths(category, os.hostname(), this.program)
    for (const name of names ?? []) {
      fsPaths = fsPaths.filter((f) =>
        partialMatch
          ? path.basename(f, '.yaml').includes(name.toLowerCase())
          : path.basename(f, '.yaml') === name.toLowerCase(),
      )
    }
    return fsPaths
  }

  constructor(program: string, executor?: string, shellOpts?: ShellOpts) {
    this.program = program
    this.executor = executor ?? ''
    this.shellOpts = shellOpts ?? {}
  }
}
