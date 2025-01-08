import type { ShellOpts } from './shell.ts'

import { shellRun } from './shell.ts'

export async function getCpuVendorName(shellOpts: ShellOpts) {
  const stdout = (
    await shellRun('cat /proc/cpuinfo | grep vendor_id | uniq', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  const cpu_vendor_id =
    stdout.length > 0 ? stdout[0].split(':')[1].trim() : 'unknown'

  if (cpu_vendor_id === 'AuthenticAMD') {
    return 'amd'
  } else if (cpu_vendor_id === 'GenuineIntel') {
    return 'intel'
  } else {
    throw new Error(`cpu vendor is not supported yet: ${cpu_vendor_id}`)
  }
}

export async function getCpuSocketCount(shellOpts: ShellOpts) {
  const stdout = (
    await shellRun('lscpu | grep Socket', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  return stdout.length > 0 ? Number(stdout[0].split(':')[1].trim()) : 1
}

export async function getCpuCoreCount(shellOpts: ShellOpts) {
  const stdout = (
    await shellRun('lscpu | grep Core', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  return stdout.length > 0 ? Number(stdout[0].split(':')[1].trim()) : 1
}

export async function getCpuThreadCount(shellOpts: ShellOpts) {
  const stdout = (
    await shellRun('lscpu | grep Thread', {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  return stdout.length > 0 ? Number(stdout[0].split(':')[1].trim()) : 1
}
