import { isInPath } from './path'
import { type ShOpts, shellRun } from './sh'

export class Tool {
  program: string
  executor: string
  shOpts: ShOpts

  shell = async (cmd: string, filters?: Array<string>) => {
    const executor =
      this.executor && (await isInPath(this.executor))
        ? `${this.executor} `
        : ''
    return shellRun(`${executor}${this.program} ${cmd}`, {
      ...this.shOpts,
      filters,
      verbose: true,
    })
  }

  constructor(program: string, executor?: string, shOpts?: ShOpts) {
    this.program = program
    this.executor = executor ?? ''
    this.shOpts = shOpts ?? {}
  }
}
