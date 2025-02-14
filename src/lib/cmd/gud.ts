import { type CmdOpts, buildCmd } from '../cmd'

export function buildSubCmd(_: () => CmdOpts) {
  const cmd = buildCmd('gud', 'make good ops').aliases(['g', ':'])

  cmd.addCommand(
    buildCmd('list', 'list on local').aliases(['l', '/', 'li', 'ls']),
  )

  cmd.addCommand(
    buildCmd('run', 'run from local')
      .aliases(['r', '$', 'rn'])
      .argument('<name>', 'name to match'),
  )

  return cmd
}
