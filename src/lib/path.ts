import { Glob } from 'bun'
import { promises as fs } from 'node:fs'
import PATH from 'node:path'

export function buildFilePath(...parts: Array<string>) {
  return PATH.join(...parts)
}

export async function isDir(dirPath: string) {
  try {
    const stat = await fs.stat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

export async function isFile(filePath: string) {
  return await Bun.file(filePath).exists()
}

export async function getFileContent(filePath: string) {
  if (!(await isFile(filePath))) {
    return ''
  }

  return await Bun.file(filePath).text()
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

  const globs: Array<Glob> = []

  const addGlob = (pattern: string) => {
    globs.push(new Glob(pattern))
  }

  if (options?.filters?.length) {
    const filterPattern = options.filters.map(f => `${f}*`).join('/')
    if (options?.extension) {
      addGlob(`${filterPattern}/*.${options.extension}`)
      addGlob(`${filterPattern}.${options.extension}`)
    } else {
      addGlob(`${filterPattern}/**`)
      addGlob(filterPattern)
    }
  } else {
    if (options?.extension) {
      addGlob(`**/*.${options.extension}`)
      addGlob(`*.${options.extension}`)
    } else {
      addGlob('**')
      addGlob('*')
    }
  }

  const filePaths: Array<string> = []
  for (const glob of globs) {
    for await (const file of glob.scan({
      absolute: true,
      cwd: dirPath,
      onlyFiles: true,
    })) {
      filePaths.push(file)
    }
  }

  return filePaths.sort()
}

export function stripExt(filePath: string) {
  const path = PATH.parse(filePath)
  return PATH.join(path.dir, path.name)
}

export function toRelParts(dirPath: string, filePath: string) {
  const dir = dirPath ? `${dirPath}${PATH.sep}` : ''
  return stripExt(filePath)
    .replace(dir, '')
    .split(PATH.sep)
    .filter(f => f)
}
