import { type CmdOpts, buildCmd } from '../cmd'

// currently implemented in launcher
export function buildSubCmd(_: () => CmdOpts) {
  return buildCmd('up', 'sync up from web').aliases(['u', '^'])
}
