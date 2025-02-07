import os from 'node:os'
import path from 'node:path'

import { type CmdOpts, type Virt, buildCmd, buildAction } from '../cmd'
import { getPathStat } from '../path'
import type { ShellOpts } from '../sh'
import { Docker } from './virt/docker'
import { Qemu } from './virt/qemu'

const validVirts = ['docker', 'qemu']

type CmdVirtArgs = {
  names?: Array<string>
}

type CmdVirtOpts = {
  manager?: string
}

export function buildCmdVirt(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('virt', 'virtualization operations')
    .aliases(['v', 'virtual'])
    .option('-m, --manager <manager>', 'virtualization manager')

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('down', 'tear down from local')
      .aliases(['d', '%', 'downgrade', 'te', 'tear'])
      .argument('[name...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('down', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('stat', 'status on local')
      .aliases(['s', '$', 'st', 'status'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('stat', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('tidy', 'tidy on local')
      .aliases(['t', '@', 'ti', 'cl', 'clean', 'pr', 'prune', 'pu', 'purge'])
      .action(buildAction(() => runCmdVirt('tidy', {}, getCmdOpts))),
  )

  cmd.addCommand(
    buildCmd('up', 'sync up from local')
      .aliases(['u', '^', 'update', 'upgrade', 'sy', 'sync'])
      .argument('[names...]', 'names to match')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('up', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

async function getValidVirts() {
  const virts: Array<string> = []
  for (const validVirt of validVirts) {
    const virtPath = path.join(
      process.env.WUT_CONFIG_LOCATION ?? '',
      'virt',
      os.hostname(),
      validVirt,
    )

    if (await getPathStat(virtPath)) {
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
      throw new Error(`unsupported virtualization manager: ${name}`)
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
      opArgs.names?.map(n => n.toLowerCase()),
    )
  }
}
