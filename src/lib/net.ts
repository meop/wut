import type { ShellOpts } from './shell.ts'

import { shellRun } from './shell.ts'

export async function getNicMac(nic: string, shellOpts: ShellOpts) {
  const out = (
    await shellRun(`cat /sys/class/net/${nic}/address`, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length > 0 ? out[0].trim() : ''
}

export async function getNicIfIndex(nic: string, shellOpts: ShellOpts) {
  const out = (
    await shellRun(`cat /sys/class/net/${nic}/ifindex`, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length > 0 ? out[0].trim() : ''
}
