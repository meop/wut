import pkg from '../package.json' with { type: 'json' }
import { program } from 'commander'

import { buildCmd } from './lib/cmd.ts'
import { buildCmdPack } from './lib/cmd/pack.ts'
import { buildCmdUp } from './lib/cmd/up.ts'
import { buildCmdVirt } from './lib/cmd/virt.ts'
import { logError } from './lib/log.ts'

export async function runCli(name: string, description: string) {
  const prog = buildCmd(name, description, program)
    .option('-d, --dry-run', 'dry run')
    .option('-v, --verbose', 'verbose output')
 
  // prog.addCommand(buildCmdDot(() => prog.opts()))
  prog.addCommand(buildCmdPack(() => prog.opts()))
  prog.addCommand(buildCmdUp(() => prog.opts()))
  prog.addCommand(buildCmdVirt(() => prog.opts()))
    
  await prog.parseAsync()
}

try {
  await runCli(pkg.name, pkg.description || '')
} catch (err) {
  logError(err.message)
}
