import { program } from 'commander'

import pkg from '../package.json' with { type: 'json' }

import { buildCmd } from './lib/cmd'
import { buildSubCmd as buildCmdFile } from './lib/cmd/file'
import { buildSubCmd as buildCmdGud } from './lib/cmd/gud'
import { buildSubCmd as buildCmdPack } from './lib/cmd/pack'
import { buildSubCmd as buildCmdStrap } from './lib/cmd/strap'
import { buildSubCmd as buildCmdUp } from './lib/cmd/up'
import { buildSubCmd as buildCmdVirt } from './lib/cmd/virt'

export async function runCli(name: string, description: string) {
  const prog = buildCmd(name, description, program)
    .option('-d, --dry-run', 'dry run')
    .option('-v, --verbose', 'verbose output')

  prog.addCommand(buildCmdFile(() => prog.opts()))
  prog.addCommand(buildCmdGud(() => prog.opts()))
  prog.addCommand(buildCmdPack(() => prog.opts()))
  prog.addCommand(buildCmdStrap(() => prog.opts()))
  prog.addCommand(buildCmdUp(() => prog.opts()))
  prog.addCommand(buildCmdVirt(() => prog.opts()))

  await prog.parseAsync()
}

await runCli(pkg.name, pkg.description || '')
