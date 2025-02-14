import { type CmdOpts, type Virt, buildCmd, buildAction } from '../cmd'
import { getArch } from '../os'
import { isInPath } from '../path'
import type { ShOpts } from '../sh'

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

type OpArgs = {
  names?: Array<string>
}

type SubCmdOpts = {
  manager?: string
}

export function buildSubCmd(getParentOpts: () => CmdOpts) {
  const cmd = buildCmd('virt', 'virtual manager ops')
    .aliases(['v', 'virtual'])
    .option('-m, --manager <manager>', 'virual manager')

  const getCmdOpts = () => {
    return {
      ...getParentOpts(),
      ...cmd.opts(),
    }
  }

  cmd.addCommand(
    buildCmd('down', 'tear down on local')
      .aliases(['d', '#', 'downgrade', 'te', 'tear'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('down', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('list', 'list on local')
      .aliases(['l', '/', 'li', 'ls', 'qu', 'query'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('list', { names }, getCmdOpts),
        ),
      ),
  )

  cmd.addCommand(
    buildCmd('stat', 'status on local')
      .aliases(['s', '%', 'st', 'status'])
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('stat', { names }, getCmdOpts),
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
      .argument('[names...]', 'name(s) tomatch')
      .action(
        buildAction((names?: Array<string>) =>
          runSubCmd('up', { names }, getCmdOpts),
        ),
      ),
  )

  return cmd
}

async function getValidVirts(shOpts?: ShOpts) {
  const virts: Array<string> = []
  for (const validVirt of Object.keys(validVirts)) {
    if (await isInPath(validVirts[validVirt][getArch()], shOpts)) {
      virts.push(validVirt)
    }
  }

  return virts
}

function getImpl(name: string, shOpts: ShOpts): Virt {
  switch (name) {
    case 'docker':
      return new Docker(shOpts)
    case 'qemu':
      return new Qemu(shOpts)
    default:
      throw new Error(`unsupported virtual manager: ${name}`)
  }
}

async function runSubCmd(
  op: string,
  opArgs: OpArgs,
  getCmdOpts: () => CmdOpts & SubCmdOpts,
) {
  const cmdOpts = getCmdOpts()

  const virtNames = cmdOpts.manager
    ? [cmdOpts.manager.toLowerCase()]
    : await getValidVirts(cmdOpts)

  for (const virtName of virtNames) {
    await getImpl(virtName, cmdOpts)[op](
      opArgs.names?.map(n => n.toLowerCase()),
    )
  }
}
