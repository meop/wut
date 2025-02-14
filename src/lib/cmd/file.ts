import { type CmdOpts, type File, buildCmd, buildAction } from '../cmd'
import type { ShOpts } from '../sh'

import { System } from './file/system'

type OpArgs = {
  names?: Array<string>
}

export function buildSubCmd(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('file', 'dot file ops').aliases([
    'f',
    'd',
    'dot',
    'dotfile',
  ])

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('diff', 'diff vs local')
      .aliases(['d', '?', 'de', 'delta'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('diff', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('pull', 'pull from local')
      .aliases(['['])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('pull', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('push', 'push from local')
      .aliases([']'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('push', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

function getDot(name: string, shOpts: ShOpts): File {
  switch (name) {
    case 'system':
      return new System(shOpts)
    default:
      throw new Error(`unsupported file manager: ${name}`)
  }
}

async function runSubCmd(
  op: string,
  opArgs: OpArgs,
  getCmdOpts: () => CmdOpts,
) {
  const cmdOpts = getCmdOpts()

  await getDot('system', cmdOpts)[op](opArgs.names?.map(n => n.toLowerCase()))
}
