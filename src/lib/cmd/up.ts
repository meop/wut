import { type CmdOpts, buildCommand } from '../cmd'

// currently implemented in launcher
export function buildCmdUp(_: () => CmdOpts) {
  return buildCommand('up', 'sync up from web').aliases([
    'u',
    '^',
    'update',
    'upgrade',
    'sy',
    'sync',
  ])
}
