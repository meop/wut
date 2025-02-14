import { type ShOpts, shellRun } from './sh'

export async function getCpuVendorName(shOpts: ShOpts) {
  const out = (
    await shellRun('cat /proc/cpuinfo | grep vendor_id | uniq', {
      ...shOpts,
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

export async function getCpuSocketCount(shOpts: ShOpts) {
  const out = (
    await shellRun('lscpu | grep Socket', {
      ...shOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].split(':')[1].trim()) : 1
}

export async function getCpuCoreCount(shOpts: ShOpts) {
  const out = (
    await shellRun('lscpu | grep Core', {
      ...shOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].split(':')[1].trim()) : 1
}

export async function getCpuThreadCount(shOpts: ShOpts) {
  const out = (
    await shellRun('lscpu | grep Thread', {
      ...shOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).out

  return out.length ? Number(out[0].split(':')[1].trim()) : 1
}
