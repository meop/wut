import { join, parse, relative, SEPARATOR } from '@std/path'

function withoutExt(filePath: string) {
  const { dir, name } = parse(filePath)
  return join(dir, name)
}

export function toRelParts(dirPath: string, filePath: string, stripExt = true) {
  const adjustedFilePath = stripExt ? withoutExt(filePath) : filePath
  return relative(dirPath, adjustedFilePath)
    .split(SEPARATOR)
    .filter((f) => f)
    .map((f) => f.trimEnd())
}

export type AclPermScope = {
  read?: boolean
  write?: boolean
  execute?: boolean
}

export type AclPerm = {
  user?: AclPermScope
  group?: AclPermScope
  other?: AclPermScope
}

function getFsAclUnixSymVal(permScope?: AclPermScope) {
  let symbols = ''
  if (permScope?.read) {
    symbols += 'r'
  }
  if (permScope?.write) {
    symbols += 'w'
  }
  if (permScope?.execute) {
    symbols += 'x'
  }
  return symbols
}

function getFsAclUnixVal(perm: AclPerm) {
  const permBlocks: Array<string> = []
  permBlocks.push(`u=${getFsAclUnixSymVal(perm.user)}`)
  permBlocks.push(`g=${getFsAclUnixSymVal(perm.group)}`)
  permBlocks.push(`o=${getFsAclUnixSymVal(perm.other)}`)
  return permBlocks.join(',')
}

function getFsAclWinntSymVal(itemPerm?: AclPermScope) {
  const symbols: Array<string> = []
  if (itemPerm?.read) {
    symbols.push('gr')
  }
  if (itemPerm?.write) {
    symbols.push('gw')
  }
  if (itemPerm?.execute) {
    symbols.push('ge')
  }

  return symbols.join(',')
}

function getFsAclWinntVal(perm: AclPerm, user: string) {
  const permBlocks: Array<string> = []
  const userPerms = getFsAclWinntSymVal(perm.user)
  if (userPerms !== '') {
    permBlocks.push(`"${user}:(${userPerms})"`)
  }
  const groupPerms = getFsAclWinntSymVal(perm.group)
  if (groupPerms !== '') {
    permBlocks.push(`"Administrators:(${groupPerms})"`)
  }
  const otherPerms = getFsAclWinntSymVal(perm.other)
  if (otherPerms !== '') {
    permBlocks.push(`"SYSTEM:(${otherPerms})"`)
  }
  return permBlocks.join(' ')
}

export function toUnixPath(filePath: string) {
  return filePath.replaceAll('\\', '/')
}

export function toWinntPath(filePath: string) {
  return filePath.replaceAll('/', '\\')
}

export function getPlatAclPermCmds(
  plat: string,
  path: string,
  perm: AclPerm,
  user: string,
) {
  switch (plat) {
    case 'darwin':
    case 'linux':
      return [`chmod -R a-s,${getFsAclUnixVal(perm)} '${toUnixPath(path)}'`]
    case 'winnt':
      return [
        `icacls '${toWinntPath(path)}' /t /reset`,
        `icacls '${toWinntPath(path)}' /t /inheritance:r /grant ${getFsAclWinntVal(perm, user)}`,
      ]
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}
