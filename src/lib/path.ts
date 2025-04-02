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
  const parts: Array<string> = []
  if (options?.filters?.length) {
    for (const f of options.filters) {
      parts.push(
        `${f.startsWith('*') ? '' : '*'}${f}${f.endsWith('*') ? '' : '*'}`,
      )
    }
  } else {
    parts.push('*')
  }

  const pattern = parts.join('/')

  const glob = new Glob(pattern)

  const filePaths: Array<string> = []
  for await (const file of glob.scan({
    absolute: true,
    cwd: dirPath,
    onlyFiles: true,
  })) {
    if (options?.extension) {
      if (!file.endsWith(`.${options.extension}`)) {
        continue
      }
    }
    filePaths.push(file)
  }

  return filePaths.sort()
}
