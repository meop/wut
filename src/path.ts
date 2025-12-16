import PATH from 'node:path'

import { SysOsPlat } from '@meop/shire/sys'

function withoutExt(filePath: string) {
  const parsedPath = PATH.parse(filePath)
  return PATH.join(parsedPath.dir, parsedPath.name)
}

export function toRelParts(dirPath: string, filePath: string, stripExt = true) {
  const dir = dirPath ? `${dirPath}${PATH.sep}` : ''
  const adjustedFilePath = stripExt ? withoutExt(filePath) : filePath
  return adjustedFilePath
    .replace(dir, '')
    .split(PATH.sep)
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
  return filePath.replaceAll(PATH.win32.sep, PATH.posix.sep)
}

export function toWinntPath(filePath: string) {
  return filePath.replaceAll(PATH.posix.sep, PATH.win32.sep)
}

export function getPlatAclPermCmds(
  plat: SysOsPlat,
  path: string,
  perm: AclPerm,
  user: string,
) {
  switch (plat) {
    case SysOsPlat.darwin:
    case SysOsPlat.linux:
      return [`chmod -R a-s,${getFsAclUnixVal(perm)} '${toUnixPath(path)}'`]
    case SysOsPlat.winnt:
      return [
        `icacls '${toWinntPath(path)}' /t /reset`,
        `icacls '${toWinntPath(path)}' /t /inheritance:r /grant ${
          getFsAclWinntVal(perm, user)
        }`,
      ]
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}
