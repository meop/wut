import { program } from 'commander'

import { buildCmd } from './cmd.ts'
import { buildCmdPack } from './cmd/pack.ts'
import { buildCmdUp } from './cmd/up.ts'

export async function runProg(name: string, description: string) {
  const prog = buildCmd(name, description, program)
    .addCommand(buildCmdPack())
    .addCommand(buildCmdUp())
  await prog.parseAsync()
}
