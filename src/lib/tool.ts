import { isInPath } from './path'
import { type ShellOpts, shellRun } from './sh'

export class Tool {
  program: string
  executor: string
  shellOpts: ShellOpts

  shell = async (cmd: string, filters?: Array<string>) => {
    const executor =
      this.executor && (await isInPath(this.executor))
        ? `${this.executor} `
        : ''
    return shellRun(`${executor}${this.program} ${cmd}`, {
      ...this.shellOpts,
      filters,
      verbose: true,
    })
  }

  constructor(program: string, executor?: string, shellOpts?: ShellOpts) {
    this.program = program
    this.executor = executor ?? ''
    this.shellOpts = shellOpts ?? {}
  }
}
