import pkg from '../package.json' with { type: 'json' }
import { program } from 'commander'

import { buildCmd } from './lib/cmd.ts'
import { buildCmdPack } from './lib/cmd/pack.ts'
import { buildCmdUp } from './lib/cmd/up.ts'

export async function runCli(name: string, description: string) {
  const prog = buildCmd(name, description, program)
    .option('-d, --dry-run', 'dry run')
    .option('-v, --verbose', 'verbose output')

  const progOpts = prog.opts()
  
  prog.addCommand(buildCmdPack(progOpts))
  prog.addCommand(buildCmdUp(progOpts))
    
  await prog.parseAsync()
}

await runCli(pkg.name, pkg.description || '')
