import { Glob } from 'bun'
import PATH from 'node:path'

export function buildFilePath(parts: Array<string>) {
  return PATH.join(...parts)
}

export function getFileText(filePath: string) {
  return Bun.file(filePath).text()
}

export async function getFilePaths(
  dirPath: string,
  extension?: string,
  filters?: Array<string>,
) {
  const glob = new Glob(`**/*.${extension ?? '*'}`)

  let filePaths: Array<string> = []
  for await (const file of glob.scan({
    absolute: true,
    cwd: dirPath,
    onlyFiles: true,
  })) {
    filePaths.push(file)
  }

  if (filters) {
    filePaths = filePaths.filter(p => {
      const leaf = p.replace(dirPath, '').toLowerCase()
      return filters?.every(f => leaf.includes(f.toLowerCase()))
    })
  }

  return filePaths
}
