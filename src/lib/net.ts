import { type ShOpts, shellRun } from './sh'

export async function getNicMac(nic: string, shOpts: ShOpts) {
  const out = (
    await shellRun(`cat /sys/class/net/${nic}/address`, {
      ...shOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? out[0].trim() : ''
}

export async function getNicIfIndex(nic: string, shOpts: ShOpts) {
  const out = (
    await shellRun(`cat /sys/class/net/${nic}/ifindex`, {
      ...shOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].trim()) : -1
}
