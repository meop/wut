import type { OptionValues } from 'commander'

import { buildCmd } from '../cmd.ts'
import { loadConfigFilePath } from '../config.ts'
import { isInPath } from '../path.ts'

import { Apt, AptGet } from './pack/aptget.ts'
import { Brew } from './pack/brew.ts'
import { Dnf } from './pack/dnf.ts'
import { Yay, Pacman } from './pack/pacman.ts'
import { Scoop } from './pack/scoop.ts'
import { WinGet } from './pack/winget.ts'

const validPacks = [
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

const validPackWraps = {
  apt: 'apt-get',
  yay: 'pacman',
  zypper: 'dnf',
}

export function buildCmdPack(getParentOpts: () => OptionValues) {
  const cmd = buildCmd('pack', 'packaging operations')
    .aliases(['p', 'package'])
    .option('-m, --manager <manager>', 'desired manager')

  const getOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('add', 'add from web')
      .aliases(['a', '+', 'in', 'install'])
      .argument('<names...>', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('add', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('cfg', 'cfg from local')
      .aliases(['c', '#', 'config', 'ru', 'run', 'ex', 'exe', 'exec'])
      .argument('<names...>', 'names of config files')
      .action((names: Array<string>) => {
        runCmdPack('cfg', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('del', 'delete on local')
      .aliases(['d', '-', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall'])
      .argument('<names...>', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('del', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('find', 'find from web')
      .aliases(['f', '?', 'fi', 'se', 'search'])
      .argument('<names...>', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('find', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('list', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('out', 'out of sync on local')
      .aliases(['o', '!', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('out', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidy on local')
      .aliases(['t', '@', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge'])
      .action(() => {
        runCmdPack('tidy', {}, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from web')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'names to match')
      .action((names: Array<string>) => {
        runCmdPack('up', { names }, getOpts)
      }),
  )

  return cmd
}

async function getValidPacks(verbose?: boolean): Promise<Array<string>> {
  const packs: Array<string> = []
  for (const validPack of validPacks) {
    if (await isInPath(validPack, verbose)) {
      packs.push(validPack)
    }
  }

  return packs
}

function getPack(name: string, cmdOptions?: Record<string, any>) {
  switch (name) {
    case 'yay':
      return new Yay(cmdOptions)
    case 'pacman':
      return new Pacman(cmdOptions)
    case 'apt':
      return new Apt(cmdOptions)
    case 'apt-get':
      return new AptGet(cmdOptions)
    case 'dnf':
      return new Dnf(cmdOptions)
    case 'brew':
      return new Brew(cmdOptions)
    case 'winget':
      return new WinGet(cmdOptions)
    case 'scoop':
      return new Scoop(cmdOptions)
    default:
      throw new Error(`not a supported package manager: ${name}`)
  }
}

async function runCmdPack(
  op: string,
  opArgs?: Record<string, any>,
  getCmdOpts?: () => Record<string, any>,
): Promise<void> {
  const cmdOpts = getCmdOpts?.()

  let packs = cmdOpts?.manager
    ? [String(cmdOpts.manager.toLowerCase())]
    : await getValidPacks(cmdOpts?.verbose)

  if (op === 'add' && packs.length > 0) {
    packs = [packs[0]]
  }

  if (op === 'cfg') {
    for (const name of opArgs?.names) {
      const config = await loadConfigFilePath('pack', name)
      if (Object.keys(config).length === 0) {
        continue
      }

      if (config['pack']) {
        for (const packName of Object.keys(config['pack'])) {
          if (!packs.includes(packName)) {
            continue
          }
          const node = config['pack'][packName]

          const names = node['names'] ?? []
          if (node['cask']) {
            names.unshift('--cask')
          }
          if (names.length === 0) {
            continue
          }

          const pack = getPack(packName, cmdOpts)

          if (node['repo']) {
            await pack['repo']({ names: [node['repo']] })
          }

          await pack['add']({ names })
        }
      }
    }
  } else {
    const redundantPacks: Array<string> = []
    for (const [key, value] of Object.entries(validPackWraps)) {
      if (packs.includes(key) && packs.includes(value)) {
        redundantPacks.push(value)
      }
    }
    packs = packs.filter((p) => !redundantPacks.includes(p))

    for (const pack of packs) {
      await getPack(pack, cmdOpts)[op](opArgs)
    }
  }
}
