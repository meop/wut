import { Glob } from 'bun'
import PATH from 'node:path'

export function buildFilePath(...parts: Array<string>) {
  return PATH.join(...parts)
}

export function getFileText(filePath: string) {
  return Bun.file(filePath).text()
}

export async function getFilePaths(
  dirPath: string,
  options?: {
    extension?: string
    filters?: Array<string>
  },
) {
  const globs: Array<Glob> = []

  const addGlob = (pattern: string) => {
    globs.push(new Glob(pattern))
  }

  if (options?.filters?.length) {
    const filterPattern = options.filters.map(f => `${f}*`).join('/')
    console.log(dirPath)
    console.log(filterPattern)

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
