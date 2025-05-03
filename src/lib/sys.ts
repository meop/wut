export function getSysCpuArch(sysCpuArch: string) {
  switch (sysCpuArch.toLowerCase()) {
    case 'amd64':
    case 'x64':
    case 'x86_64':
      return 'x86_64'
    case 'aarch64':
    case 'arm64':
      return 'aarch64'
    default:
      throw new Error(`unsupported cpu architecture: ${sysCpuArch}`)
  }
}

export function getSysCpuVenId(sysCpuVenId: string) {
  switch (sysCpuVenId.toLowerCase()) {
    case 'amd':
    case 'authenticamd':
      return 'amd'
    case 'intel':
    case 'genuineintel':
      return 'intel'
    case 'arm':
      return 'arm'
    case 'apple':
      return 'apple'
    default:
      throw new Error(`unsupported cpu vendor: ${sysCpuVenId}`)
  }
}

export function getSysOsId(sysOsId: string) {
  switch (sysOsId.toLowerCase()) {
    case 'arch':
    case 'archarm':
      return 'arch'
    case 'debian':
    case 'raspbian':
      return 'debian'
    default:
      throw new Error(`unsupported os id: ${sysOsId}`)
  }
}

export function getSysOsPlat(sysOsPlat: string) {
  switch (sysOsPlat.toLowerCase()) {
    case 'linux':
      return 'linux'
    case 'darwin':
    case 'macos':
      return 'darwin'
    case 'win32':
    case 'windows':
    case 'windows_nt':
    case 'winnt':
      return 'winnt'
    default:
      throw new Error(`unsupported os platform: ${sysOsPlat}`)
  }
}
