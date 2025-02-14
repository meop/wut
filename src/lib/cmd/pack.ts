import { getCfgFilePath, getCfgFilePaths, loadCfgFileContents } from '../cfg'
import { type CmdOpts, type Pack, buildCmd, buildAction } from '../cmd'
import { isInPath, splitPath } from '../path'
import { type ShOpts, shellRun } from '../sh'

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

type OpArgs = {
  names?: Array<string>
}

type SubCmdOpts = {
  manager?: string
}

export function buildSubCmd(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('pack', 'package manager ops')
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
          runSubCmd('add', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('del', 'delete on local')
      .aliases(['d', '-', 'delete', 'rm', 'rem', 'remove', 'un', 'uninstall'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runSubCmd('del', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('find', 'find from web')
      .aliases(['f', '?', 'fi', 'se', 'search'])
      .argument('<names...>', 'name(s) to match')
      .action(
        buildAction((names: Array<string>) =>
          runSubCmd('find', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('out', 'out of sync on local')
      .aliases(['o', '!', 'ou', 'outdated', 'ob', 'obsolete', 'ol', 'old'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('out', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidy on local')
      .aliases(['t', '@', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge'])
      .action(buildAction(() => runSubCmd('tidy', {}, getCmdOpts))),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from web')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'name(s) to match')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('up', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

async function getValidPacks(shOpts?: ShOpts) {
  const packs: Array<string> = []
  for (const validPack of validPacks) {
    if (await isInPath(validPack, shOpts)) {
      packs.push(validPack)
    }
  }

  return packs
}

function getImpl(name: string, shOpts?: ShOpts): Pack {
  switch (name) {
    case 'yay':
      return new Yay(shOpts)
    case 'pacman':
      return new Pacman(shOpts)
    case 'apt':
      return new Apt(shOpts)
    case 'apt-get':
      return new AptGet(shOpts)
    case 'dnf':
      return new Dnf(shOpts)
    case 'brew':
      return new Brew(shOpts)
    case 'winget':
      return new WinGet(shOpts)
    case 'scoop':
      return new Scoop(shOpts)
    default:
      throw new Error(`unsupported package manager: ${name}`)
  }
}

async function runSubCmd(
  op: string,
  opArgs: OpArgs,
  getCmdOpts: () => CmdOpts & SubCmdOpts,
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
      await getImpl(packName, cmdOpts)[op](name ? [name] : undefined)
    }
  }

  if (!opArgsNames.length) {
    await invokeFallbackPackNames()
    return
  }

  const pathParts = ['pack']
  const cPath = getCfgFilePath(pathParts)
  const fsPaths = await getCfgFilePaths(pathParts)

  for (const name of opArgsNames) {
    const foundPaths = fsPaths.filter(f =>
      splitPath(f.replace(cPath, '')).find(
        p => p.split('.')[0].toLowerCase() === name,
      ),
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
        await getImpl(packName, cmdOpts)[op](names)
        await preOrPostCmd('del')
      }
    }
    if (!foundPackages) {
      await invokeFallbackPackNames(name)
    }
  }
}
