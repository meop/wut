import type { ShellOpts } from './shell.ts'

import os from 'os'
import path from 'path'

import { findConfigFilePaths } from './config.ts'
import { shellRun } from './shell.ts'

export class Tool {
  program: string
  shellOpts: ShellOpts

  shell = (cmd: string, filters?: Array<string>) => {
    return shellRun(`${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  async _fsPaths(names?: Array<string>, partialMatch: boolean = false) {
    let fsPaths = await findConfigFilePaths('virt', os.hostname(), this.program)
    for (const name of names ?? []) {
      fsPaths = fsPaths.filter((f) =>
        partialMatch
          ? path.basename(f, '.yaml').includes(name.toLowerCase())
          : path.basename(f, '.yaml') === name.toLowerCase(),
      )
    }
    return fsPaths
  }

  constructor(program: string, shellOpts?: ShellOpts) {
    this.program = program
    this.shellOpts = shellOpts ?? {}
  }
}
