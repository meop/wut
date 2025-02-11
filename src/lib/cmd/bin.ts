import { type CmdOpts, type Bin, buildCmd, buildAction } from '../cmd'
import type { ShellOpts } from '../sh'

import { Shell } from './bin/shell'

type CmdBinArgs = {
  names?: Array<string>
}

export function buildCmdBin(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('bin', 'bin operations').aliases(['b', 'binexec'])

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdBin('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('run', 'run on local')
      .aliases(['r', '$', 'exe', 'exec', 'execute'])
      .argument('<names...>', 'names to match')
      .action(
        buildAction((names: Array<string>) =>
          runCmdBin('run', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

function getBin(name: string, shellOpts: ShellOpts): Bin {
  switch (name) {
    case 'shell':
      return new Shell(shellOpts)
    default:
      throw new Error(`unsupported bin manager: ${name}`)
  }
}

async function runCmdBin(
  op: string,
  opArgs: CmdBinArgs,
  getCmdOpts: () => CmdOpts,
) {
  const cmdOpts = getCmdOpts()

  await getBin('shell', cmdOpts)[op](opArgs.names?.map(n => n.toLowerCase()))
}
