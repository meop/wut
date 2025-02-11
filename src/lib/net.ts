import { type ShellOpts, shellRun } from './sh'

export async function getNicMac(nic: string, shellOpts: ShellOpts) {
  const out = (
    await shellRun(`cat /sys/class/net/${nic}/address`, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? out[0].trim() : ''
}

export async function getNicIfIndex(nic: string, shellOpts: ShellOpts) {
  const out = (
    await shellRun(`cat /sys/class/net/${nic}/ifindex`, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].trim()) : -1
}
