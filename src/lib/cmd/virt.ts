import type { CmdOpts, Virt } from '../cmd.ts'
import type { ShellOpts } from '../shell.ts'

import os from 'os'
import path from 'path'

import { buildCmd } from '../cmd.ts'
import { doesPathExist } from '../path.ts'

import { Docker } from './virt/docker.ts'
import { Qemu } from './virt/qemu.ts'

const validVirts = ['docker', 'qemu']

type CmdVirtArgs = {
  names?: Array<string>
}

type CmdVirtOpts = {
  manager?: string
}

export function buildCmdVirt(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('virt', 'virtualization manager operations')
    .aliases(['v', 'virtual'])
    .option('-m, --manager <manager>', 'desired manager')

  const getOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('down', 'tear down from local')
      .aliases(['d', '%', 'downgrade', 'te', 'tear'])
      .argument('[name...]', 'names to match')
      .action((names?: Array<string>) => {
        runCmdVirt('down', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action((names?: Array<string>) => {
        runCmdVirt('list', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('stat', 'status on local')
      .aliases(['s', '$', 'st', 'status'])
      .argument('[names...]', 'names to match')
      .action((names?: Array<string>) => {
        runCmdVirt('stat', { names }, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidy on local')
      .aliases(['t', '@', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge'])
      .action(() => {
        runCmdVirt('tidy', {}, getOpts)
      }),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from local')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'names to match')
      .action((names?: Array<string>) => {
        runCmdVirt('up', { names }, getOpts)
      }),
  )

  return cmd
}

async function getValidVirts() {
  const virts: Array<string> = []
  for (const validVirt of validVirts) {
    if (
      await doesPathExist(
        path.join(
          process.env.WUT_CONFIG_LOCATION ?? '',
          'virt',
          os.hostname(),
          validVirt,
        ),
      )
    ) {
      virts.push(validVirt)
    }
  }
  return virts
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

  const virtNames = cmdOpts.manager
    ? [String(cmdOpts.manager.toLowerCase())]
    : await getValidVirts()

  for (const virtName of virtNames) {
    await getVirt(virtName, cmdOpts)[op](
      opArgs.names?.map((n) => n.toLowerCase()),
    )
  }
}
