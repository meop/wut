import type { Command, OptionValues } from 'commander'

import type { CmdOpts, Virt } from '../cmd.ts'
import type { ShellOpts } from '../shell.ts'

import { hostname } from 'os'
import { basename, dirname } from 'path'

import { buildCmd } from '../cmd.ts'
import { findConfigFilePaths } from '../config.ts'
import { log } from '../log.ts'

import { Docker } from './virt/docker.ts'
import { Qemu } from './virt/qemu.ts'

type CmdVirtArgs = {
  tool?: string
  name?: string
}

type CmdVirtOpts = {}

export function buildCmdVirt(getParentOpts: () => OptionValues): Command {
  const cmd = buildCmd('virt', 'virtualization manager operations').aliases([
    'v',
    'virtual',
  ])

  const getOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('down', 'tear down from local')
      .aliases(['d', '%', 'downgrade', 'te', 'tear'])
      .argument('[tool]', 'tool to match')
      .argument('[name]', 'name to match')
      .action((tool?: string, name?: string) => {
        runCmdVirt('down', { tool, name }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[tool]', 'tool to match')
      .argument('[name]', 'name to match')
      .action((tool?: string, name?: string) => {
        runCmdVirt('list', { tool, name }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('stat', 'status on local')
      .aliases(['s', '$', 'status'])
      .argument('[tool]', 'tool to match')
      .argument('[name]', 'name to match')
      .action((tool?: string, name?: string) => {
        runCmdVirt('stat', { tool, name }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from local')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[tool]', 'tool to match')
      .argument('[name]', 'name to match')
      .action((tool?: string, name?: string) => {
        runCmdVirt('up', { tool, name }, getOpts)
      }),
  )

  return cmd
}

function getVirt(name: string, shellOpts: ShellOpts): Virt {
  switch (name) {
    case 'docker':
      return new Docker(shellOpts)
    case 'qemu':
      return new Qemu(shellOpts)
    default:
      throw new Error(`not a supported virtualization manager: ${name}`)
  }
}

async function runCmdVirt(
  op: string,
  opArgs: CmdVirtArgs,
  getCmdOpts: () => CmdOpts & CmdVirtOpts,
) {
  const cmdOpts = getCmdOpts()

  const parts = [hostname()]
  if (opArgs.tool) {
    parts.push(opArgs.tool)
  }

  let fsPaths = await findConfigFilePaths('virt', ...parts)
  if (opArgs.name) {
    fsPaths = fsPaths.filter((f) => basename(f, '.yaml') === opArgs.name)
  }

  const fsPathMap: Map<string, Array<string>> = new Map()

  for (const fsPath of fsPaths) {
    const virtName = basename(dirname(fsPath))
    if (!fsPathMap.has(virtName)) {
      fsPathMap.set(virtName, [])
    }
    fsPathMap.get(virtName)?.push(fsPath)
  }

  for (const fsPathItem of fsPathMap.keys()) {
    if (op === 'list') {
      log(`${fsPathItem}:`)
      log(
        fsPathMap
          .get(fsPathItem)
          ?.map((x) => `  ${x}`)
          .join('\n') ?? '',
      )
    } else {
      await getVirt(fsPathItem, cmdOpts)[op](fsPathMap.get(fsPathItem))
    }
  }
}
