import { Command } from 'commander'

import pkg from '../package.json' with { type: 'json' }

import { buildCmd } from './lib/cmd'
import { buildSubCmd as buildCmdFile } from './lib/cmd/file'
import { buildSubCmd as buildCmdGud } from './lib/cmd/gud'
import { buildSubCmd as buildCmdPack } from './lib/cmd/pack'
import { buildSubCmd as buildCmdStrap } from './lib/cmd/strap'
import { buildSubCmd as buildCmdUp } from './lib/cmd/up'
import { buildSubCmd as buildCmdVirt } from './lib/cmd/virt'

export async function buildProg() {
  const prog = buildCmd(pkg.name, pkg.description, new Command())
    .option('-d, --dry-run', 'dry run')
    .option('-v, --verbose', 'verbose output')

  prog.addCommand(buildCmdFile(() => prog.opts()))
  prog.addCommand(buildCmdGud(() => prog.opts()))
  prog.addCommand(buildCmdPack(() => prog.opts()))
  prog.addCommand(buildCmdStrap(() => prog.opts()))
  prog.addCommand(buildCmdUp(() => prog.opts()))
  prog.addCommand(buildCmdVirt(() => prog.opts()))

  return prog
}
