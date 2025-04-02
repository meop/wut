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
  const pattern = ['**']
  if (options?.filters?.length) {
    pattern.push(`/*${options.filters.join('*/*')}*`)
  }
  if (options?.extension) {
    pattern.push(`/*.${options.extension}`)
  }

  const glob = new Glob(pattern.join(''))

  const filePaths: Array<string> = []
  for await (const file of glob.scan({
    absolute: true,
    cwd: dirPath,
    onlyFiles: true,
  })) {
    filePaths.push(file)
  }

  return filePaths.sort()
}
