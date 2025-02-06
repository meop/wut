import { type CmdOpts, type Dot, buildCommand, buildAction } from '../cmd'
import type { ShellOpts } from '../sh'
import { File } from './dot/file'

type CmdDotArgs = {
  names?: Array<string>
}

export function buildCmdDot(getParentOpts: () => CmdOpts) {
  const cmd = buildCommand('dot', 'dotfile operations').aliases([
    'd',
    'dotfile',
  ])

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCommand('diff', 'diff vs local')
      .aliases(['d', '?', 'de', 'delta'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdDot('diff', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCommand('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdDot('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCommand('pull', 'pull from local')
      .aliases(['['])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdDot('pull', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCommand('push', 'push to local')
      .aliases([']'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdDot('push', { names }, getCmdOpts),
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
  getCmdOpts: () => CmdOpts,
) {
  const cmdOpts = getCmdOpts()

  await getDot('file', cmdOpts)[op](opArgs.names?.map(n => n.toLowerCase()))
}
