export function getCpuArch(cpuArch: string) {
  const cpuArchLower = cpuArch.toLowerCase()
  switch (cpuArchLower) {
    case 'amd64':
    case 'x64':
    case 'x86_64':
      return 'amd64'
    case 'aarch64':
    case 'arm64':
      return 'arm64'
    default:
      throw new Error(`unsupported cpu architecture: ${cpuArchLower}`)
  }
}

export function getOsPlat(osPlat: string) {
  const osPlatLower = osPlat.toLowerCase()
  switch (osPlatLower) {
    case 'linux':
      return 'linux'
    case 'darwin':
    case 'macos':
      return 'macos'
    case 'win32':
    case 'winnt':
    case 'windows':
      return 'windows'
    default:
      throw new Error(`unsupported os platform: ${osPlatLower}`)
  }
}
