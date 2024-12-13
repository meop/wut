import type { Pack } from './pack.i.ts'

import { buildCmd } from '../cmd.ts'
import { isInPath } from '../path.ts'
import { Brew } from './pack/brew.ts'

const supportedPacks = [
  'pkg',
  'apt-get',
  'apt',
  'dnf',
  'paru',
  'yay',
  'pacman',
  'brew',
  'winget',
  'scoop',
]

export function buildCmdPack() {
  const cmd = buildCmd('pack', 'packaging operations')
    .aliases(['p', 'package'])
    .option('-m, --manager <manager>', 'desired package manager')

  cmd.addCommand(
    buildCmd('add', 'add from web')
      .aliases(['a', '+', 'in', 'install'])
      .argument('<names...>', 'list of names')
      .action((names) => {
        runCmdPack('add', { names }, cmd.opts())
      }),
  )

  cmd.addCommand(
    buildCmd('del', 'delete from local')
      .aliases(['d', '-', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall'])
      .argument('<names...>', 'list of names')
      .action((names) => {
        runCmdPack('del', { names }, cmd.opts())
      }),
  )

  cmd.addCommand(
    buildCmd('find', 'find from web')
      .aliases(['f', '?', 'se', 'search'])
      .argument('<name>', 'match name')
      .action((name) => {
        runCmdPack('find', { name }, cmd.opts())
      }),
  )

  cmd.addCommand(
    buildCmd('list', 'list from local')
      .aliases(['l', '/', 'ls', 'qu', 'query'])
      .argument('[name]', 'match name')
      .action((name) => {
        runCmdPack('list', { name }, cmd.opts())
      }),
  )

  cmd.addCommand(
    buildCmd('out', 'outdated from local')
      .aliases(['o', '!', 'outdated', 'old', 'ob', 'obsolete'])
      .argument('[name]', 'match name')
      .action((name) => {
        runCmdPack('out', { name }, cmd.opts())
      }),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidyup from local')
      .aliases(['t', '@', 'tidyup', 'cl', 'clean', 'cleanup', 'pu', 'purge'])
      .action(() => {
        runCmdPack('tidy', {}, cmd.opts())
      }),
  )

  cmd.addCommand(
    buildCmd('up', 'upgrade from web')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'list of names')
      .action((names) => {
        runCmdPack('up', { names }, cmd.opts())
      }),
  )

  return cmd
}

async function getPack(): Promise<string> {
  let pack = ''
  for (const p of supportedPacks) {
    const path = await isInPath(p)
    if (path) {
      pack = p
      break
    }
  }
  if (!pack) {
    throw new Error('no supported package manager found')
  }

  return pack
}

async function runCmdPack(
  op: string,
  opArgs?: Record<string, any>,
  cmdOptions?: Record<string, any>,
): Promise<void> {
  const packName = cmdOptions?.manager
    ? String(cmdOptions.manager)
    : await getPack()

  let pack: Pack

  switch (packName) {
    case 'paru':
      throw new Error(`not ready yet`)
      break
    case 'yay':
      throw new Error(`not ready yet`)
      break
    case 'pacman':
      throw new Error(`not ready yet`)
      break
    case 'pkg':
      throw new Error(`not ready yet`)
      break
    case 'apt-get':
      throw new Error(`not ready yet`)
      break
    case 'apt':
      throw new Error(`not ready yet`)
      break
    case 'dnf':
      throw new Error(`not ready yet`)
      break
    case 'brew':
      pack = new Brew()
      break
    case 'winget':
      throw new Error(`not ready yet`)
      break
    case 'scoop':
      throw new Error(`not ready yet`)
      break
    default:
      throw new Error(`not a supported package manager: ${packName}`)
  }

  await pack[op](opArgs)
}
