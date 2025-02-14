import { program } from 'commander'

import pkg from '../package.json' with { type: 'json' }

import { buildCmd } from './lib/cmd'
import { buildCmdBoot } from './lib/cmd/boot'
import { buildCmdDot } from './lib/cmd/dot'
import { buildCmdPack } from './lib/cmd/pack'
import { buildCmdStrap } from './lib/cmd/strap'
import { buildCmdUp } from './lib/cmd/up'
import { buildCmdVirt } from './lib/cmd/virt'

export async function runCli(name: string, description: string) {
  const prog = buildCmd(name, description, program)
    .option('-d, --dry-run', 'dry run')
    .option('-v, --verbose', 'verbose output')

  prog.addCommand(buildCmdBoot(() => prog.opts()))
  prog.addCommand(buildCmdDot(() => prog.opts()))
  prog.addCommand(buildCmdPack(() => prog.opts()))
  prog.addCommand(buildCmdStrap(() => prog.opts()))
  prog.addCommand(buildCmdUp(() => prog.opts()))
  prog.addCommand(buildCmdVirt(() => prog.opts()))

  await prog.parseAsync()
}

await runCli(pkg.name, pkg.description || '')
