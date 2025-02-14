import { type CmdOpts, type Virt, buildCmd, buildAction } from '../cmd'
import { getArch } from '../os'
import { isInPath } from '../path'
import type { ShellOpts } from '../sh'

import { Docker } from './virt/docker'
import { Qemu } from './virt/qemu'

const validVirts = {
  docker: {
    amd64: 'docker',
    arm64: 'docker',
  },
  qemu: {
    amd64: 'qemu-system-x86_64',
    arm64: 'qemu-system-aarch64',
  },
}

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
      .aliases(['d', '#', 'downgrade', 'te', 'tear'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('down', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('stat', 'status on local')
      .aliases(['s', '%', 'st', 'status'])
      .argument('[names...]', 'name(s) tomatch')
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
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runCmdVirt('up', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

async function getValidVirts(shellOpts?: ShellOpts) {
  const virts: Array<string> = []
  for (const validVirt of Object.keys(validVirts)) {
    if (await isInPath(validVirts[validVirt][getArch()], shellOpts)) {
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
    ? [cmdOpts.manager.toLowerCase()]
    : await getValidVirts(cmdOpts)

  for (const virtName of virtNames) {
    await getVirt(virtName, cmdOpts)[op](
      opArgs.names?.map(n => n.toLowerCase()),
    )
  }
}
