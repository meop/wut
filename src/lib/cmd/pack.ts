import path from 'node:path'

import { getCfgFilePaths, loadCfgFileContents } from '../cfg'
import { type CmdOpts, type Pack, buildCmd, buildAction } from '../cmd'
import { isInPath } from '../path'
import { type ShellOpts, shellRun } from '../sh'

import { Apt, AptGet } from './pack/aptget'
import { Brew } from './pack/brew'
import { Dnf } from './pack/dnf'
import { Yay, Pacman } from './pack/pacman'
import { Scoop } from './pack/scoop'
import { WinGet } from './pack/winget'

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

type CmdPackArgs = {
  names?: Array<string>
}

type CmdPackOpts = {
  manager?: string
}

export function buildCmdPack(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('pack', 'package operations')
    .aliases(['p', 'package'])
    .option('-m, --manager <manager>', 'package manager')

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('add', 'add from web')
      .aliases(['a', '+', 'in', 'install'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runCmdPack('add', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('del', 'delete on local')
      .aliases(['d', '-', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runCmdPack('del', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('find', 'find from web')
      .aliases(['f', '?', 'fi', 'se', 'search'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runCmdPack('find', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdPack('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('out', 'out of sync on local')
      .aliases(['o', '!', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdPack('out', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidy on local')
      .aliases(['t', '@', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge'])
      .action(buildAction(() => runCmdPack('tidy', {}, getCmdOpts))),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from web')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdPack('up', { names }, getCmdOpts),
        ),
      ),
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
      throw new Error(`unsupported package manager: ${name}`)
  }
}

async function runCmdPack(
  op: string,
  opArgs: CmdPackArgs,
  getCmdOpts: () => CmdOpts & CmdPackOpts,
) {
  const cmdOpts = getCmdOpts()

  const packNames = cmdOpts.manager
    ? [cmdOpts.manager.toLowerCase()]
    : await getValidPacks(cmdOpts)

  const opArgsNames = opArgs.names?.map(n => n.toLowerCase()) ?? []

  const redundantPackNames: Array<string> = []
  for (const [key, value] of Object.entries(validPackWraps)) {
    if (packNames.includes(key) && packNames.includes(value)) {
      redundantPackNames.push(value)
    }
  }

  let fallbackPackNames = packNames.filter(p => !redundantPackNames.includes(p))

  if (['add', 'del', 'find'].includes(op)) {
    fallbackPackNames = [fallbackPackNames[0]]
  }

  const invokeFallbackPackNames = async (name?: string) => {
    for (const packName of fallbackPackNames) {
      await getPack(packName, cmdOpts)[op](name ? [name] : undefined)
    }
  }

  if (!opArgsNames.length) {
    await invokeFallbackPackNames()
    return
  }

  const fsPaths = await getCfgFilePaths(['pack'])

  for (const name of opArgsNames) {
    const foundPaths = fsPaths.filter(
      f => path.parse(f).name.toLowerCase() === name,
    )
    if (!foundPaths.length) {
      await invokeFallbackPackNames(name)
      continue
    }

    let foundPackages = false
    for (const foundPath of foundPaths) {
      const config = await loadCfgFileContents(foundPath)

      for (const packName of Object.keys(config)) {
        if (!packNames.includes(packName)) {
          continue
        }
        const packItem = config[packName]

        const names = packItem.names ?? []
        if (!names.length) {
          continue
        }
        foundPackages = true

        if (packItem.cask) {
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
    }
    if (!foundPackages) {
      await invokeFallbackPackNames(name)
    }
  }
}
