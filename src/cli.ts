import { program } from 'commander'

import pkg from '../package.json' with { type: 'json' }

import { buildCommand } from './lib/cmd'
import { buildCmdDot } from './lib/cmd/dot'
import { buildCmdPack } from './lib/cmd/pack'
import { buildCmdSet } from './lib/cmd/set'
import { buildCmdUp } from './lib/cmd/up'
import { buildCmdVirt } from './lib/cmd/virt'

export async function runCli(name: string, description: string) {
  const prog = buildCommand(name, description, program)
    .option('-d, --dry-run', 'dry run')
    .option('-v, --verbose', 'verbose output')

  prog.addCommand(buildCmdDot(() => prog.opts()))
  prog.addCommand(buildCmdPack(() => prog.opts()))
  prog.addCommand(buildCmdUp(() => prog.opts()))
  prog.addCommand(buildCmdVirt(() => prog.opts()))

  await prog.parseAsync()
}

await runCli(pkg.name, pkg.description || '')
