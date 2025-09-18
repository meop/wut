import { promises as fs } from 'node:fs'
import PATH from 'node:path'

export function buildFilePath(...parts: Array<string>) {
  return PATH.join(...parts)
}

export async function isDir(dirPath: string) {
  try {
    return (await fs.stat(dirPath)).isDirectory()
  } catch {
    return false
  }
}

export async function isFile(filePath: string) {
  try {
    return (await fs.stat(filePath)).isFile()
  } catch {
    return false
  }
}

export async function isValidPath(fsPath: string) {
  try {
    await fs.stat(fsPath)
    return true
  } catch {
    return false
  }
}

export async function getFileContent(filePath: string) {
  if (!(await isFile(filePath))) {
    return null
  }

  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function getFilePaths(
  dirPath: string,
  options?: {
    extension?: string
    filters?: Array<string>
  },
) {
  if (!(await isDir(dirPath))) {
    return []
  }

  const patterns: Array<string> = []

  if (options?.filters?.length) {
    const filterPattern = options.filters.map((f) => `${f}*`).join('/')
    if (options?.extension) {
      patterns.push(`${filterPattern}/*.${options.extension}`)
      patterns.push(`${filterPattern}.${options.extension}`)
    } else {
      patterns.push(`${filterPattern}/**`)
      patterns.push(filterPattern)
    }
  } else {
    if (options?.extension) {
      patterns.push(`**/*.${options.extension}`)
      patterns.push(`*.${options.extension}`)
    } else {
      patterns.push('**')
      patterns.push('*')
    }
  }

  const filePaths: Array<string> = []
  for (const pattern of patterns) {
    for await (
      const match of fs.glob(pattern, {
        cwd: dirPath,
        withFileTypes: true,
      })
    ) {
      if (match.isFile()) {
        filePaths.push(PATH.join(match.parentPath, match.name))
      }
    }
  }

  return [...new Set(filePaths)].sort()
}

function withStripExt(filePath: string) {
  const path = PATH.parse(filePath)
  return PATH.join(path.dir, path.name)
}

export function toRelParts(dirPath: string, filePath: string, stripExt = true) {
  const dir = dirPath ? `${dirPath}${PATH.sep}` : ''
  const adjustedFilePath = stripExt ? withStripExt(filePath) : filePath
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

function toUnixPath(filePath: string) {
  return filePath.replaceAll(PATH.win32.sep, PATH.posix.sep)
}

function toWinntPath(filePath: string) {
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
