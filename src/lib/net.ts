import type { ShellOpts } from './shell.ts'

import { shellRun } from './shell.ts'

export async function getNicMac(nic: string, shellOpts: ShellOpts) {
  const stdout = (
    await shellRun(`cat /sys/class/net/${nic}/address`, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  return stdout.length > 0 ? stdout[0].trim() : ''
}

export async function getNicIfIndex(nic: string, shellOpts: ShellOpts) {
  const stdout = (
    await shellRun(`cat /sys/class/net/${nic}/ifindex`, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  return stdout.length > 0 ? stdout[0].trim() : ''
}
