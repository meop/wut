import { type CmdOpts, type Strap, buildCmd, buildAction } from '../cmd'
import type { ShellOpts } from '../sh'

import { Shell } from './strap/shell'

type CmdStrapArgs = {
  names?: Array<string>
}

export function buildCmdStrap(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('strap', 'strap operations').aliases(['s', 'st', 'str'])

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdStrap('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('run', 'run on local')
      .aliases(['r', '$', 'exe', 'exec', 'execute'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runCmdStrap('run', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

function getStrap(name: string, shellOpts: ShellOpts): Strap {
  switch (name) {
    case 'shell':
      return new Shell(shellOpts)
    default:
      throw new Error(`unsupported strap manager: ${name}`)
  }
}

async function runCmdStrap(
  op: string,
  opArgs: CmdStrapArgs,
  getCmdOpts: () => CmdOpts,
) {
  const cmdOpts = getCmdOpts()

  await getStrap('shell', cmdOpts)[op](opArgs.names?.map(n => n.toLowerCase()))
}
