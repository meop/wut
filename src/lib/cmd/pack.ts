import type { OptionValues } from 'commander'
import type { Pack } from './pack.i.ts'

import { buildCmd } from '../cmd.ts'
import { isInPath } from '../path.ts'

import { Apt, AptGet } from './pack/aptget.ts'
import { Brew } from './pack/brew.ts'
import { Dnf } from './pack/dnf.ts'
import { Yay, Pacman } from './pack/pacman.ts'
import { Scoop } from './pack/scoop.ts'
import { WinGet } from './pack/winget.ts'

const packs = [
  'apt',
  'apt-get',
  'yay',
  'pacman',
  'zypper',
  'dnf',
  'brew',
  'winget',
  'scoop',
]

const packWraps = {
  apt: 'apt-get',
  yay: 'pacman',
  zypper: 'dnf',
}

export function buildCmdPack(opts: OptionValues) {
  const cmd = buildCmd('pack', 'packaging operations')
    .aliases(['p', 'package'])
    .option('-m, --manager <manager>', 'desired manager')

  const cmdOpts = {
    ...opts,
    ...cmd.opts(),
  }

  cmd.addCommand(
    buildCmd('add', 'add from web')
      .aliases(['a', '+', 'in', 'install'])
      .argument('<names...>', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('add', { names }, cmdOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('del', 'delete on local')
      .aliases(['d', '-', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall'])
      .argument('<names...>', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('del', { names }, cmdOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('find', 'find from web')
      .aliases(['f', '?', 'fi', 'se', 'search'])
      .argument('<names...>', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('find', { names }, cmdOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('list', { names }, cmdOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('out', 'out of sync on local')
      .aliases(['o', '!', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('out', { names }, cmdOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidy on local')
      .aliases(['t', '@', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge'])
      .action(() => {
        runCmdPack('tidy', {}, cmdOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from web')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('up', { names }, cmdOpts)
      }),
  )

  return cmd
}

async function getPacks(verbose?: boolean): Promise<Array<string>> {
  const packsFound: Array<string> = []
  for (const p of packs) {
    if (await isInPath(p, verbose)) {
      packsFound.push(p)
    }
  }

  return packsFound
}

async function runCmdPack(
  op: string,
  opArgs?: Record<string, any>,
  cmdOptions?: Record<string, any>,
): Promise<void> {
  let packNames = cmdOptions?.manager
    ? [String(cmdOptions.manager.toLowerCase())]
    : await getPacks(cmdOptions?.verbose)

  const redundantPacks: Array<string> = []
  for (const [key, value] of Object.entries(packWraps)) {
    if (packNames.includes(key) && packNames.includes(value)) {
      redundantPacks.push(value)
    }
  }
  packNames = packNames.filter((p) => !redundantPacks.includes(p))

  for (const packName of packNames) {
    let pack: Pack

    switch (packName) {
      case 'yay':
        pack = new Yay(cmdOptions)
        break
      case 'pacman':
        pack = new Pacman(cmdOptions)
        break
      case 'apt':
        pack = new Apt(cmdOptions)
        break
      case 'apt-get':
        pack = new AptGet(cmdOptions)
        break
      case 'dnf':
        pack = new Dnf(cmdOptions)
        break
      case 'brew':
        pack = new Brew(cmdOptions)
        break
      case 'winget':
        pack = new WinGet(cmdOptions)
        break
      case 'scoop':
        pack = new Scoop(cmdOptions)
        break
      default:
        throw new Error(`not a supported package manager: ${packName}`)
    }

    await pack[op](opArgs)
  }
}
