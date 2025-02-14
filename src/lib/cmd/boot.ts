import { type CmdOpts, buildCmd } from '../cmd'

// currently implemented in launcher
export function buildCmdBoot(_: () => CmdOpts) {
  const cmd = buildCmd('boot', 'boot strap from local').aliases(['b', 'bs'])

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
