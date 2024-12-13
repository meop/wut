export function getPlatform(): string {
  switch (process.platform) {
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'macos'
    case 'win32':
      return 'windows'
    default:
      throw new Error(`unsupported platform: ${process.platform}`)
  }
}
