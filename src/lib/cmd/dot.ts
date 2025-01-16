import type { CmdOpts, Dot } from '../cmd.ts'
import type { ShellOpts } from '../shell.ts'

import { buildCmd, buildAct } from '../cmd.ts'

import { File } from './dot/file.ts'

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
      .action(
        buildAct((names?: Array<string>) =>
          runCmdDot('list', { names }, getOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('pull', 'pull from local')
      .aliases(['['])
      .argument('[names...]', 'names to match')
      .action(
        buildAct((names?: Array<string>) =>
          runCmdDot('pull', { names }, getOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('push', 'push to local')
      .aliases([']'])
      .argument('[names...]', 'names to match')
      .action(
        buildAct((names?: Array<string>) =>
          runCmdDot('push', { names }, getOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('stat', 'status on local')
      .aliases(['s', '$', 'st', 'status'])
      .argument('[names...]', 'names to match')
      .action(
        buildAct((names?: Array<string>) =>
          runCmdDot('stat', { names }, getOpts),
        ),
      ),
  )

  return cmd
}

function getDot(name: string, shellOpts: ShellOpts): Dot {
  switch (name) {
    case 'file':
      return new File(shellOpts)
    default:
      throw new Error(`unsupported dotfile manager: ${name}`)
  }
}

async function runCmdDot(
  op: string,
  opArgs: CmdDotArgs,
  getCmdOpts: () => CmdOpts & CmdDotOpts,
) {
  const cmdOpts = getCmdOpts()

  await getDot('file', cmdOpts)[op](opArgs.names?.map((n) => n.toLowerCase()))
}
