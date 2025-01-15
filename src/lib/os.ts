export function getArch() {
  switch (process.arch) {
    case 'x64':
      return 'amd64'
    case 'arm64':
      return 'arm64'
    default:
      throw new Error(`unsupported arch: ${process.arch}`)
  }
}

export function getPlat() {
  switch (process.platform) {
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'macos'
    case 'win32':
      return 'windows'
    default:
      throw new Error(`unsupported plat: ${process.platform}`)
  }
}
