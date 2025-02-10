import path from 'node:path'

import type { Bin } from '../../cmd'
import type { ShellOpts } from '../../sh'

export class Shell implements Bin {
  list: (names?: Array<string>) => Promise<void>
  run: (names: Array<string>) => Promise<void>
  shellOpts: ShellOpts
}
