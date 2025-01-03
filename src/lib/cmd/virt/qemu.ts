import { parseArgs } from 'util'

import { log, logInfo, logWarn, logError } from '../../log.ts'
import { execShell } from '../../shell.ts'
import { sleep } from '../../time.ts'

const images_dir_path = '/data/ware/images'

const swtpm_binary_path = '/usr/bin/swtpm'
const swtpm_tmp_dir_path = '/tmp/swtpm'

const qemu_binary_path = '/usr/bin/qemu-system-x86_64'
const qemu_virt_dir_path = '/virt/qemu'

const sleep_time_ms = 2 * 1000

const { values, positionals } = parseArgs({
  args: process.argv,
  options: {
    install: {
      type: 'boolean',
    },
    foreground: {
      type: 'boolean',
    },
    'no-passthru': {
      type: 'boolean',
    },
    'dry-run': {
      type: 'boolean',
    },
  },
  strict: true,
  allowPositionals: true,
})

const nameWasProvided = positionals.length > 2

const name = nameWasProvided ? positionals[2] : ''
const install = values['install'] === true
const foreground = values['foreground'] === true
const no_passthru = values['no-passthru'] === true
const dry_run = values['dry-run'] === true

log(`name: ${name}`)
log(`--install: ${install}`)
log(`--foreground: ${foreground}`)
log(`--no-passthru: ${no_passthru}`)
log(`--dry-run: ${dry_run}`)

if (!nameWasProvided) {
  throw new Error('name was not provided')
}

const cpuFlagsVendor = ['+invtsc', '+topoext']
const cpuFlagsVendorAmd = [...cpuFlagsVendor, '+svm']
const cpuFlagsVendorIntel = [...cpuFlagsVendor, '+vmx']

const cpuFlagsOs: Array<string> = []
const cpuFlagsOsWindows = [
  ...cpuFlagsOs,
  'hv-relaxed',
  'hv-vapic',
  'hv-spinlocks=0x1fff',
  'hv-vpindex',
  'hv-runtime',
  'hv-time',
  'hv-synic',
  'hv-stimer',
  'hv-stimer-direct',
  'hv-tlbflush',
  'hv-tlbflush-direct',
  'hv-tlbflush-ext',
  'hv-frequencies',
  'hv-reenlightenment',
  'hv-xmm-input',
  'hv-emsr-bitmap',
  'hv-ipi',
  'hv-avic',
]
const cpuFlagsOsLinux = [...cpuFlagsOs]

interface CpuFlagsKvp {
  [key: string]: {
    [key: string]: Array<string>
  }
}

const CpuFlags: CpuFlagsKvp = {
  amd: {
    windows: [...cpuFlagsVendorAmd, ...cpuFlagsOsWindows],
    linux: [...cpuFlagsVendorAmd, ...cpuFlagsOsLinux],
  },
  intel: {
    windows: [...cpuFlagsVendorIntel, ...cpuFlagsOsWindows, 'hv-evmcs'],
    linux: [...cpuFlagsVendorIntel, ...cpuFlagsOsLinux],
  },
}

async function fsMkdir(path: string) {
  await execShell(`mkdir -p ${path}`, { dryRun: dry_run, asRoot: true })
}

async function fsExists(path: string) {
  return (
    (
      await execShell(`-E sh -c 'if [ -e ${path} ]; then echo 1; fi'`, {
        dryRun: dry_run,
        asRoot: true,
      })
    ).stdout === '1'
  )
}

async function findRunning(...args: Array<string>) {
  const findCmd = 'pgrep -af'
  const lines = (
    await execShell(`${findCmd} "${args.join('.*')}" && echo -n ""`, {
      dryRun: dry_run,
      asRoot: true,
    })
  ).stdout
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => !x.includes(findCmd))
  return lines
}

async function getCpuVendor() {
  const cpu_vendor_id = (
    await execShell('cat /proc/cpuinfo | grep vendor_id | uniq')
  ).stdout
    .split(':')[1]
    .trim()

  if (cpu_vendor_id === 'AuthenticAMD') {
    return 'amd'
  } else if (cpu_vendor_id === 'GenuineIntel') {
    return 'intel'
  } else {
    throw new Error(`cpu vendor is not supported yet: ${cpu_vendor_id}`)
  }
}

async function getCpuSockets() {
  return (await execShell('lscpu | grep Socket')).stdout.split(':')[1].trim()
}
async function getCpuCores() {
  return (await execShell('lscpu | grep Core')).stdout.split(':')[1].trim()
}
async function getCpuThreads() {
  return (await execShell('lscpu | grep Thread')).stdout.split(':')[1].trim()
}

function getUefiImageVariant(os: string) {
  // https://packages.debian.org/sid/all/ovmf/
  // ar xv *.deb
  // tar xf data.tar.xz
  return 'windows' === os ? '.ms' : ''
}

try {
  async function getSpecs() {
    const cpu_vendor = await getCpuVendor()
    const cpu_sockets = await getCpuSockets()
    const cpu_cores = await getCpuCores()
    const cpu_threads = await getCpuThreads()

    if (name === 'glass') {
      const nic = 'mvt0'
      const os = 'windows'
      const disc_image_dir_path = `${qemu_virt_dir_path}/${name}`
      const tpm_tmp_dir_path = `${swtpm_tmp_dir_path}/${name}`
      const uefiImageVariant = getUefiImageVariant(os)
      const disks = [
        '-object iothread,id=iot0',
        '-device virtio-scsi-pci,id=scsi0,iothread=iot0',
        `-blockdev driver=file,node-name=file0,aio=threads,cache.direct=off,discard=unmap,filename=${disc_image_dir_path}/os.raw`,
        '-blockdev driver=raw,node-name=ssd0,file=file0',
        '-device scsi-hd,scsi-id=0,drive=ssd0,rotation_rate=1',
      ]
      if (!install) {
        disks.push(
          ...[
            '-blockdev driver=host_device,node-name=file1,aio=native,cache.direct=on,discard=unmap,filename=/dev/disk/by-id/ata-CT2000MX500SSD1_1905E1E7E300',
            '-blockdev driver=raw,node-name=ssd1,file=file1',
            '-device scsi-hd,scsi-id=1,drive=ssd1,rotation_rate=1',
          ],
        )
      }

      return {
        cpu_flags: CpuFlags[cpu_vendor][os],
        cpu_sockets,
        cpu_cores,
        cpu_threads,
        disks,
        // https://www.microsoft.com/software-download/windows11/
        image_os_file_path: `${images_dir_path}/${os}/Win11_24H2_English_x64.iso`,
        // https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/
        nic,
        nic_mac: (await execShell(`cat /sys/class/net/${nic}/address`)).stdout,
        ram: '24g',
        image_drivers_file_path: `${images_dir_path}/${os}/virtio-win-0.1.266.iso`,
        os,
        nic_tap_index: (await execShell(`cat /sys/class/net/${nic}/ifindex`))
          .stdout,
        tpm_tmp_dir_path,
        uefi_code_file_path: `${disc_image_dir_path}/OVMF_CODE_4M${uefiImageVariant}.fd`,
        uefi_vars_file_path: `${disc_image_dir_path}/OVMF_VARS_4M${uefiImageVariant}.fd`,
      }
    } else {
      throw new Error(`name is not supported yet: ${name}`)
    }
  }

  const specs = await getSpecs()

  // this sets up a software TPM 2.0 device, a Windows 11 requirement (bypassable in registry)
  // once Windows is booted, you can clear its settings from the Windows TPM control panel tab
  // alternatively, Linux / Qemu is capable of passing through a real TPM from the host too
  // but that seems less portable
  function buildSwtpmFlags() {
    return [
      'socket',
      `--ctrl type=unixio,path=${specs.tpm_tmp_dir_path}/socket`,
      '--log file=-',
      '--tpm2',
      `--tpmstate dir=${specs.tpm_tmp_dir_path}`,
      '--daemon',
    ]
  }

  function buildQemuFlags() {
    const flags = [
      `-name ${name}`,
      '-machine type=q35,accel=kvm,pflash0=flash0,pflash1=flash1',
      '-nodefaults',
      '-global ICH9-LPC.disable_s3=1',
      '-global ICH9-LPC.disable_s4=1',
      '-global driver=cfi.pflash01,property=secure,value=on',
      `-blockdev driver=file,node-name=flash0,read-only=on,filename=${specs.uefi_code_file_path}`,
      `-blockdev driver=file,node-name=flash1,discard=unmap,filename=${specs.uefi_vars_file_path}`,
      '-boot menu=on',
      `-chardev socket,id=cdtpm0,path=${specs.tpm_tmp_dir_path}/socket`,
      '-tpmdev emulator,id=tpm0,chardev=cdtpm0',
      '-device tpm-tis,tpmdev=tpm0',
      '-rtc base=localtime,clock=host',
      `-cpu host,host-cache-info=on,migratable=off${
        specs.cpu_flags ? ',' + specs.cpu_flags.join(',') : ''
      }`,
      `-smp sockets=${specs.cpu_sockets},cores=${specs.cpu_cores},threads=${specs.cpu_threads}`,
      `-m ${specs.ram}`,
      `-netdev tap,fd=3,id=net0,vhost=on,vhostfd=4 3<>/dev/tap${specs.nic_tap_index} 4<>/dev/vhost-net`,
      `-device virtio-net-pci,netdev=net0,mac=${specs.nic_mac}`,
      '-device virtio-rng-pci',
      '-device qemu-xhci',
    ]

    if (specs.disks) {
      flags.push(...specs.disks)
    }
    if (specs.image_os_file_path) {
      flags.push(
        ...[
          `-drive "if=none,media=cdrom,id=iso0,readonly=on,file=${specs.image_os_file_path}"`,
          '-device usb-storage,drive=iso0,removable=true',
        ],
      )
    }
    if (specs.image_drivers_file_path) {
      flags.push(
        ...[
          `-drive "if=none,media=cdrom,id=iso1,readonly=on,file=${specs.image_drivers_file_path}"`,
          '-device usb-storage,drive=iso1,removable=true',
        ],
      )
    }

    if (install) {
      if (no_passthru) {
        flags.push(
          ...['-device usb-kbd', '-device usb-tablet', '-device ramfb'],
        )
      }
    } else {
      if (no_passthru) {
        flags.push(
          ...[
            '-device virtio-keyboard-pci',
            '-device virtio-tablet-pci',
            '-device virtio-gpu-pci',
          ],
        )
      }
    }

    if (no_passthru) {
      flags.push(...['-display gtk'])
    } else {
      flags.push(
        ...[
          '-display none',
          '-device vfio-pci,host=01:00.0,multifunction=on',
          '-device vfio-pci,host=01:00.1',
          '-device vfio-pci,host=01:00.2',
          '-device vfio-pci,host=01:00.3',
        ],
      )
    }

    if (foreground) {
      flags.push(...['-monitor stdio'])
    } else {
      flags.push(...['-monitor none', '-daemonize'])
    }

    return flags
  }

  // this code unbinds the Linux EFI framebuffer, as it might still be attached to the discrete GPU
  // it can be disabled in the Linux boot flags, but that is not always desired, as you might not
  // see some important output
  // alternative is to disable with boot flag: initcall_blacklist=sysfb_init
  async function detachEfiFb() {
    if (
      await fsExists(
        '/sys/bus/platform/drivers/efi-framebuffer/efi-framebuffer.0',
      )
    ) {
      execShell('echo 0 > /sys/class/vtconsole/vtcon0/bind', {
        dryRun: dry_run,
        asRoot: true,
      })
      execShell('echo 0 > /sys/class/vtconsole/vtcon1/bind', {
        dryRun: dry_run,
        asRoot: true,
      })
      execShell(
        'echo efi-framebuffer.0 > /sys/bus/platform/drivers/efi-framebuffer/unbind',
        { dryRun: dry_run, asRoot: true },
      )
      await sleep(dry_run ? 0 : sleep_time_ms)
    }
  }

  async function runSwtpm(flags: Array<string>) {
    const cmd = `${swtpm_binary_path} ${flags.join(' ')}`

    if (dry_run) {
      await execShell(cmd, { dryRun: dry_run, asRoot: true })
      return
    }

    const existingProcs = await findRunning(
      swtpm_binary_path,
      specs.tpm_tmp_dir_path,
    )
    if (existingProcs.length > 0) {
      logWarn('swtpm already running:')
      logInfo(existingProcs.join('\n'))
    } else {
      if (!(await fsExists(specs.tpm_tmp_dir_path))) {
        await fsMkdir(specs.tpm_tmp_dir_path)
      }
      await execShell(cmd, { dryRun: false, asRoot: true })
      await sleep(dry_run ? 0 : sleep_time_ms)
    }
  }

  async function runQemu(flags: Array<string>) {
    const cmd = `${qemu_binary_path} ${flags.join(' ')}`

    if (dry_run) {
      await execShell(cmd, { dryRun: dry_run, asRoot: true })
      return
    }

    const existingProcs = await findRunning(qemu_binary_path, name)
    if (existingProcs.length > 0) {
      logWarn('qemu already running:')
      logInfo(existingProcs.join('\n'))
    } else {
      await execShell(cmd, { dryRun: false, asRoot: true })
      await sleep(dry_run ? 0 : sleep_time_ms)
    }
  }

  await detachEfiFb()
  await runSwtpm(buildSwtpmFlags())
  await runQemu(buildQemuFlags())
} catch (err) {
  if (err instanceof Error) {
    logError(err.message)
  }
}
