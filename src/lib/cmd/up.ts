import type { OptionValues } from 'commander'

import { buildCmd } from '../cmd.ts'

// currently implemented in launcher
export function buildCmdUp(_opts: OptionValues) {
  return buildCmd('up', 'sync up from web').aliases([
    'u',
    '^',
    'update',
    'upgrade',
    'sy',
    'sync',
  ])
}
