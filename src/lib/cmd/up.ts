import type { CmdOpts } from '../cmd.ts'

import { buildCmd } from '../cmd.ts'

// currently implemented in launcher
export function buildCmdUp(_: () => CmdOpts) {
  return buildCmd('up', 'sync up from web').aliases([
    'u',
    '^',
    'update',
    'upgrade',
    'sy',
    'sync',
  ])
}
