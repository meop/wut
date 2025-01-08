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
import { log, logWarn } from '../../log.ts'
import { getNicIfIndex, getNicMac } from '../../net.ts'
import { doesPathExist, makePathExist } from '../../path.ts'
import { shellRun } from '../../shell.ts'
import { sleep } from '../../time.ts'

const SleepTimeMs = 2 * 1000

// this code unbinds the Linux EFI framebuffer, as it might still be attached to the discrete GPU
// this binding can be prevented via the Linux boot flag: initcall_blacklist=sysfb_init
// but that may be undesired, if you want to see output during boot
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

export class Qemu implements Virt {
  shellOpts: ShellOpts

  async down(fsPaths: Array<string>) {}

  async _run(config: any, configVm: any, shellOpts: ShellOpts) {
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

  async _stat(fsPaths: Array<string>) {
    const filters: Array<string> = []
    for (const fsPath of fsPaths) {
      filters.push(basename(fsPath, '.yaml'))
    }

    const matches: Array<string> = []

    for (const f of filters) {
      const findCmd = 'pgrep -af'
      const procFilters = ['qemu', f]
      const stream = await shellRun(
        `sudo -E sh -c '${findCmd} "${procFilters.join('.*')}" && echo -n ""'`,
        {
          ...this.shellOpts,
          filters: [findCmd],
          reverseFilters: true,
        },
      )

      if (stream.stdout) {
        matches.push(...stream.stdout)
      }
    }

    return matches
  }

  async stat(fsPaths: Array<string>) {
    for (const match of await this._stat(fsPaths)) {
      log(match)
    }
  }

  async up(fsPaths: Array<string>) {
    const config = await loadConfigFile(
      (
        await findConfigFilePaths('virt')
      ).find((f) => f.endsWith('qemu.yaml')) ?? '',
    )

    for (const fsPath of fsPaths) {
      if ((await this._stat([fsPath])).length > 0) {
        logWarn(`already running: ${fsPath}`)
        continue
      }

      const configVm = await loadConfigFile(fsPath)

      await this._run(config, configVm, this.shellOpts)
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
