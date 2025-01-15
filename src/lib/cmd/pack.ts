import type { CmdOpts, Pack } from '../cmd.ts'
import type { ShellOpts } from '../shell.ts'

import { buildCmd } from '../cmd.ts'
import { findConfigFilePaths, loadConfigFile } from '../config.ts'
import { isInPath } from '../path.ts'
import { shellRun } from '../shell.ts'

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
  'scoop',
  'winget',
]

const validPackWraps = {
  apt: 'apt-get',
  yay: 'pacman',
  zypper: 'dnf',
}

type CmdPackArgs = {
  names?: Array<string>
}

type CmdPackOpts = {
  manager?: string
}

export function buildCmdPack(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('pack', 'package manager operations')
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
      .action((names?: Array<string>) => {
        runCmdPack('list', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('out', 'out of sync on local')
      .aliases(['o', '!', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old'])
      .argument('[names...]', 'names to match')
      .action((names?: Array<string>) => {
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
      .action((names?: Array<string>) => {
        runCmdPack('up', { names }, getOpts)
      }),
  )

  return cmd
}

async function getValidPacks(shellOpts?: ShellOpts) {
  const packs: Array<string> = []
  for (const validPack of validPacks) {
    if (await isInPath(validPack, shellOpts)) {
      packs.push(validPack)
    }
  }

  return packs
}

function getPack(name: string, shellOpts?: ShellOpts): Pack {
  switch (name) {
    case 'yay':
      return new Yay(shellOpts)
    case 'pacman':
      return new Pacman(shellOpts)
    case 'apt':
      return new Apt(shellOpts)
    case 'apt-get':
      return new AptGet(shellOpts)
    case 'dnf':
      return new Dnf(shellOpts)
    case 'brew':
      return new Brew(shellOpts)
    case 'winget':
      return new WinGet(shellOpts)
    case 'scoop':
      return new Scoop(shellOpts)
    default:
      throw new Error(`not a supported package manager: ${name}`)
  }
}

async function runCmdPack(
  op: string,
  opArgs: CmdPackArgs,
  getCmdOpts: () => CmdOpts & CmdPackOpts,
) {
  const cmdOpts = getCmdOpts()

  let packNames = cmdOpts.manager
    ? [String(cmdOpts.manager.toLowerCase())]
    : await getValidPacks(cmdOpts)

  const opArgsNames = opArgs.names?.map((n) => n.toLowerCase()) ?? []
  const opArgsNamesRemaining: Array<string> = []

  const fsPaths = await findConfigFilePaths('pack')
  for (const name of opArgsNames) {
    const foundPath = fsPaths.find((f) => f.endsWith(`${name}.yaml`))
    if (!foundPath) {
      opArgsNamesRemaining.push(name)
      continue
    }

    const config = await loadConfigFile(foundPath)
    if (Object.keys(config).length === 0) {
      opArgsNamesRemaining.push(name)
      continue
    }

    let matched = false
    for (const packName of Object.keys(config)) {
      if (!packNames.includes(packName)) {
        continue
      }
      const packItem = config[packName]

      const names = packItem['names'] ?? []
      if (names.length === 0) {
        continue
      }
      matched = true

      if (packItem['cask']) {
        names.unshift('--cask')
      }

      const preOrPostCmd = async (opName: string) => {
        if (op === opName && opName in packItem) {
          for (const cmd of packItem[opName]) {
            await shellRun(cmd, { ...cmdOpts, verbose: true })
          }
        }
      }

      await preOrPostCmd('add')
      await getPack(packName, cmdOpts)[op](names)
      await preOrPostCmd('del')
    }
    if (!matched) {
      opArgsNamesRemaining.push(name)
    }
  }

  if (opArgsNames.length === 0 || opArgsNamesRemaining.length > 0) {
    if (op === 'add' && packNames.length > 0) {
      packNames = [packNames[0]]
    }

    const redundantPackNames: Array<string> = []
    for (const [key, value] of Object.entries(validPackWraps)) {
      if (packNames.includes(key) && packNames.includes(value)) {
        redundantPackNames.push(value)
      }
    }
    packNames = packNames.filter((p) => !redundantPackNames.includes(p))

    for (const packName of packNames) {
      await getPack(packName, cmdOpts)[op](opArgsNamesRemaining)
    }
  }
}
