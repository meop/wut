import { type CmdOpts, type Exec, buildCmd, buildAction } from '../cmd'
import type { ShOpts } from '../sh'

import { Shell } from './exec/shell'

type OpArgs = {
  names?: Array<string>
}

export function buildSubCmd(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('strap', 'boot strap ops').aliases([
    's',
    'st',
    'str',
    'b',
    'bs',
    'boot',
    'bootstrap',
  ])

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
          runSubCmd('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('run', 'run from local')
      .aliases(['r', '$', 'rn', 'exe', 'exec', 'execute'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runSubCmd('run', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

function getImpl(name: string, shOpts: ShOpts): Exec {
  switch (name) {
    case 'shell':
      return new Shell(true, ['strap'], shOpts)
    default:
      throw new Error(`unsupported strap manager: ${name}`)
  }
}

async function runSubCmd(
  op: string,
  opArgs: OpArgs,
  getCmdOpts: () => CmdOpts,
) {
  const cmdOpts = getCmdOpts()

  await getImpl('shell', cmdOpts)[op](opArgs.names?.map(n => n.toLowerCase()))
}
