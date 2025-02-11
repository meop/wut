import { type ShellOpts, shellRun } from './sh'

export async function getCpuVendorName(shellOpts: ShellOpts) {
  const out = (
    await shellRun('cat /proc/cpuinfo | grep vendor_id | uniq', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  const cpu_vendor_id = out.length ? out[0].split(':')[1].trim() : 'unknown'

  if (cpu_vendor_id === 'AuthenticAMD') {
    return 'amd'
  }
  if (cpu_vendor_id === 'GenuineIntel') {
    return 'intel'
  }
  throw new Error(`unsupported cpu vendor: ${cpu_vendor_id}`)
}

export async function getCpuSocketCount(shellOpts: ShellOpts) {
  const out = (
    await shellRun('lscpu | grep Socket', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].split(':')[1].trim()) : 1
}

export async function getCpuCoreCount(shellOpts: ShellOpts) {
  const out = (
    await shellRun('lscpu | grep Core', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].split(':')[1].trim()) : 1
}

export async function getCpuThreadCount(shellOpts: ShellOpts) {
  const out = (
    await shellRun('lscpu | grep Thread', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].split(':')[1].trim()) : 1
}
