import { buildCmd, type CmdOpts, type Dot } from '../cmd.ts'
import type { ShellOpts } from '../shell.ts'

type CmdDotArgs = {
  names?: Array<string>
}

type CmdDotOpts = {}

export function buildCmdDot(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('dot', 'dotfile operations').aliases(['d', 'dotfile'])

  const getOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdDot('list', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('pull', 'pull from local')
      .aliases(['['])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdDot('pull', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('push', 'push to local')
      .aliases([']'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdDot('push', { names }, getOpts)
      }),
  )

  return cmd
}

async function runCmdDot(
  op: string,
  opArgs: CmdDotArgs,
  getCmdOpts: () => CmdOpts & CmdDotOpts,
) {
  const cmdOpts = getCmdOpts()

  const opArgsNames = opArgs.names ?? []
}
