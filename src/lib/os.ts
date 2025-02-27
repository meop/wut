import { fmtPath, splitPath } from './path'

export function getArch(arch: string = process.arch) {
  const archLower = arch.toLowerCase()
  switch (archLower) {
    case 'amd64':
    case 'x64':
    case 'x86_64':
      return 'amd64'
    case 'aarch64':
    case 'arm64':
      return 'arm64'
    default:
      throw new Error(`unsupported cpu architecture: ${archLower}`)
  }
}

export function getPlat(plat: string = process.platform) {
  const platLower = plat.toLowerCase()
  switch (platLower) {
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
      throw new Error(`unsupported os platform: ${platLower}`)
  }
}

export function getSh(sh: string = process.env.SHELL ?? '') {
  const shLeaf = splitPath(fmtPath(sh)).pop() ?? ''
  const shLower = shLeaf.toLowerCase()
  switch (shLower) {
    case 'pwsh':
      return 'pwsh'
    case 'zsh':
      return 'zsh'
    default:
      throw new Error(`unsupported sys shell: ${shLower}`)
  }
}
