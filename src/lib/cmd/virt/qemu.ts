import type { Virt } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import { basename } from 'path'

import { findConfigFilePaths, loadConfigFile } from '../../config.ts'
import {
  getCpuCoreCount,
  getCpuSocketCount,
  getCpuThreadCount,
  getCpuVendorName,
} from '../../cpu.ts'
import { log, logInfo, logWarn } from '../../log.ts'
import { getNicIfIndex, getNicMac } from '../../net.ts'
import { doesPathExist, makePathExist } from '../../path.ts'
import { shellRun } from '../../shell.ts'
import { sleep } from '../../time.ts'

const SleepTimeMs = 2 * 1000

// unbinds the Linux EFI framebuffer, as it might still be attached to the GPU
// even if you change the UEFI setting for GPU preference to integrated in the motherboard
// i have found that Linux still binds to the discrete GPU first anyway
// this binding can be prevented globally via this Linux boot option:
/*
initcall_blacklist=sysfb_init
*/
// but this option may be undesired if you want to see output during boot
// so we can instead rebind post-boot like so
async function unbindEfiFb(shellOpts: ShellOpts) {
  const checkPath =
    '/sys/bus/platform/drivers/efi-framebuffer/efi-framebuffer.0'
  if (!(await doesPathExist(checkPath))) {
    return
  }

  const cmds = [
    'echo 0 > /sys/class/vtconsole/vtcon0/bind',
    'echo 0 > /sys/class/vtconsole/vtcon1/bind',
    'echo efi-framebuffer.0 > /sys/bus/platform/drivers/efi-framebuffer/unbind',
  ]
  for (const cmd of cmds) {
    await shellRun(`sudo -E sh -c '${cmd}'`, {
      ...shellOpts,
      pipeOutAndErr: true,
    })
  }

  await sleep(shellOpts?.dryRun ? 0 : SleepTimeMs)
}

// GPU is often made up of mutiple devices: VGA, Audio, USB, Serial
// Linux can be told to bind drivers to them like so: /etc/modprobe.d/vfio.conf
/*
blacklist i2c_nvidia_gpu
blacklist nouveau
options kvm ignore_msrs=1 report_ignored_msrs=0
options kvm_amd avic=1
options vfio_pci ids=10de:1ec7,10de:10f8,10de:1ad8,10de:1ad9
*/
// but still, if some generic in-kernel drivers load first, they end up binding first
// it may be possible to carefully arrange pieces of /etc/mkinitcpio.conf
// to control driver load order, but that may be tedious, and not always work either
// so we can instead rebind post-boot like so
async function rebindVfioPci(pciDevId: string, shellOpts: ShellOpts) {
  const driver = 'vfio-pci'
  const fullPciDevId = `0000:${pciDevId}`

  const checkPath = `/sys/bus/pci/devices/${fullPciDevId}/driver_override`
  if (!(await doesPathExist(checkPath))) {
    return
  }

  const checkDriver = `readlink /sys/bus/pci/devices/${fullPciDevId}/driver`
  const stdout = (
    await shellRun(checkDriver, {
      ...shellOpts,
      dryRun: false,
      pipeOutAndErr: true,
    })
  ).stdout

  const currentDriver = stdout.length > 0 ? basename(stdout[0].trim()) : ''

  if (currentDriver === driver) {
    return
  }

  const cmds = [
    `echo ${driver} > /sys/bus/pci/devices/${fullPciDevId}/driver_override`,
    `echo ${fullPciDevId} > /sys/bus/pci/devices/${fullPciDevId}/driver/unbind`,
    `echo ${fullPciDevId} > /sys/bus/pci/drivers/${driver}/bind`,
    `echo > /sys/bus/pci/devices/${fullPciDevId}/driver_override`,
  ]

  for (const cmd of cmds) {
    await shellRun(`sudo -E sh -c '${cmd}'`, {
      ...shellOpts,
      pipeOutAndErr: true,
    })
  }

  await sleep(shellOpts?.dryRun ? 0 : SleepTimeMs)
}

function vmName(fsPath: string) {
  return basename(fsPath, '.yaml')
}

async function vmRun(config: any, configVm: any, shellOpts: ShellOpts) {
  const env = {}
  const envRaw = [...config['env'], ...configVm['env']]
  for (const e of envRaw) {
    const parts = e.split('=')
    env[String(parts[0])] = String(parts[1])
  }
  env['QEMU_GUEST_CPU_CORES'] = await getCpuCoreCount(shellOpts)
  env['QEMU_GUEST_CPU_SOCKETS'] = await getCpuSocketCount(shellOpts)
  env['QEMU_GUEST_CPU_THREADS'] = await getCpuThreadCount(shellOpts)
  env['QEMU_GUEST_CPU_VENDOR_NAME'] = await getCpuVendorName(shellOpts)

  env['QEMU_HOST_NIC_MAC'] = await getNicMac(env['QEMU_HOST_NIC'], shellOpts)
  env['QEMU_HOST_NIC_IF_INDEX'] = await getNicIfIndex(
    env['QEMU_HOST_NIC'],
    shellOpts,
  )

  const arch = env['QEMU_GUEST_ARCH']
  const plat = env['QEMU_GUEST_PLAT']
  const vendor = env['QEMU_GUEST_CPU_VENDOR_NAME']

  await unbindEfiFb(shellOpts)
  for (const pciDevId of env['VFIO_PCI_DEV_IDS'].split(',')) {
    await rebindVfioPci(pciDevId, shellOpts)
  }

  const envReplace = (flags: Array<string>) => {
    const newFlags: Array<string> = []
    for (let f of flags) {
      if (f.includes('{env.')) {
        for (const e of Object.keys(env)) {
          f = f.replace(`{env.${e}}`, env[e])
        }
      }
      newFlags.push(f)
    }
    return newFlags
  }

  if ('swtpm' in configVm) {
    const swtpmBin: string = config['swtpm'][arch]['bin']

    const swtpmFlagsRaw: Array<string> = configVm['swtpm']['flags']
    const swtpmFlags = envReplace(swtpmFlagsRaw)

    for (const f of swtpmFlags) {
      if (f.includes('--tpmstate')) {
        const swtpmPath = f.split('=')[1]
        await makePathExist(swtpmPath, shellOpts)
      }
    }

    const swtpmFullCmd =
      swtpmBin + (swtpmFlags.length > 0 ? ` ${swtpmFlags.join(' ')}` : '')
    await shellRun(`sudo -E sh -c '${swtpmFullCmd}'`, {
      ...shellOpts,
      verbose: true,
    })

    await sleep(shellOpts?.dryRun ? 0 : SleepTimeMs)
  }

  if ('qemu' in configVm) {
    const qemuBin = config['qemu'][arch]['bin']

    const qemuCpuFlags: Array<string> = []

    if (config?.['qemu']?.[arch]?.['cpu']?.['_']?.['_']?.['flags']) {
      qemuCpuFlags.push(...config['qemu'][arch]['cpu']['_']['_']['flags'])
    }
    if (config?.['qemu']?.[arch]?.['cpu']?.[vendor]?.['_']?.['flags']) {
      qemuCpuFlags.push(...config['qemu'][arch]['cpu'][vendor]['_']['flags'])
    }
    if (config?.['qemu']?.[arch]?.['cpu']?.['_']?.[plat]?.['flags']) {
      qemuCpuFlags.push(...config['qemu'][arch]['cpu']['_'][plat]['flags'])
    }
    if (config?.['qemu']?.[arch]?.['cpu']?.[vendor]?.[plat]?.['flags']) {
      qemuCpuFlags.push(...config['qemu'][arch]['cpu'][vendor][plat]['flags'])
    }

    env['QEMU_GUEST_CPU_FLAGS'] =
      qemuCpuFlags.length > 0 ? `,${qemuCpuFlags.join(',')}` : ''

    const qemuFlagsRaw: Array<string> = configVm['qemu']['flags']
    const qemuFlags = envReplace(qemuFlagsRaw)

    const qemuFullCmd =
      qemuBin + (qemuFlags.length > 0 ? ` ${qemuFlags.join(' ')}` : '')
    await shellRun(`sudo -E sh -c '${qemuFullCmd}'`, {
      ...shellOpts,
      verbose: true,
    })

    await sleep(shellOpts?.dryRun ? 0 : SleepTimeMs)
  }
}

async function vmStats(fsPaths: Array<string>, shellOpts: ShellOpts) {
  const matches: Array<string> = []

  for (const name of fsPaths.map((f) => vmName(f))) {
    const findCmd = 'pgrep -fa'
    const procFilter = ['qemu', name].join('.*')
    const stream = await shellRun(
      `sudo -E sh -c '${findCmd} "${procFilter}" && echo -n ""'`,
      {
        ...shellOpts,
        dryRun: false,
        filters: [findCmd],
        pipeOutAndErr: true,
        reverseFilters: true,
      },
    )

    if (stream.stdout) {
      matches.push(...stream.stdout)
    }
  }

  if (shellOpts?.verbose) {
    for (const match of matches) {
      log(match)
    }
  }

  return matches
}

export class Qemu implements Virt {
  shellOpts: ShellOpts

  async down(fsPaths: Array<string>) {
    for (const fsPath of fsPaths) {
      const matches = await vmStats([fsPath], {
        ...this.shellOpts,
        dryRun: false,
      })
      if (matches.length > 0) {
        logInfo(`setting down: ${fsPath}`)
        const termCmd = 'pkill -f'
        const termFilter = ['qemu', vmName(fsPath)].join('.*')
        await shellRun(
          `sudo -E sh -c '${termCmd} "${termFilter}"'`,
          this.shellOpts,
        )
      } else {
        logWarn(`already down: ${fsPath}`)
      }
    }
  }
  async stat(fsPaths: Array<string>) {
    await vmStats(fsPaths, { ...this.shellOpts, verbose: true })
  }
  async tidy() {}
  async up(fsPaths: Array<string>) {
    const config = await loadConfigFile(
      (
        await findConfigFilePaths('virt')
      ).find((f) => f.endsWith('qemu.yaml')) ?? '',
    )

    for (const fsPath of fsPaths) {
      const matches = await vmStats([fsPath], {
        ...this.shellOpts,
        dryRun: false,
      })
      if (matches.length > 0) {
        logWarn(`already up: ${fsPath}`)
      } else {
        logInfo(`setting up: ${fsPath}`)
        const configVm = await loadConfigFile(fsPath)
        await vmRun(config, configVm, this.shellOpts)
      }
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
