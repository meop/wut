import { buildCmd } from '../cmd.ts'

// currently implemented in launcher
export function buildCmdUp() {
  return buildCmd('up', 'upgrade').aliases(['u', '^', 'update', 'upgrade'])
}
