import PATH from 'node:path'

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

function getFsAclUnixSymVal(itemPerm?: AclPermScope) {
  let symbols = ''
  if (itemPerm?.read) {
    symbols += 'r'
  }
  if (itemPerm?.write) {
    symbols += 'w'
  }
  if (itemPerm?.execute) {
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
  plat: string,
  fsPath: string,
  perm: AclPerm,
  user: string,
) {
  switch (plat) {
    case 'linux':
    case 'darwin':
      return [`chmod -R a-s,${getFsAclUnixVal(perm)} '${toUnixPath(fsPath)}'`]
    case 'winnt':
      return [
        `icacls '${toWinntPath(fsPath)}' /t /reset`,
        `icacls '${toWinntPath(fsPath)}' /t /inheritance:r /grant ${
          getFsAclWinntVal(perm, user)
        }`,
      ]
    default:
      throw new Error(`unsupported os platform: ${plat}`)
  }
}
