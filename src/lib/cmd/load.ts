import { type CmdOpts, buildCmd } from '../cmd'

// currently implemented in launcher
export function buildCmdLoad(_: () => CmdOpts) {
  const cmd = buildCmd('load', 'load system prep').aliases(['l'])

  cmd.addCommand(
    buildCmd('list', 'list on local').aliases(['l', '/', 'li', 'ls']),
  )

  cmd.addCommand(
    buildCmd('run', 'run on local')
      .aliases(['r', '$'])
      .argument('<name>', 'name to match'),
  )

  return cmd
}
