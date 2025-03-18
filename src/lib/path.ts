import { promises as fs } from 'node:fs'
import path from 'node:path'

export function fmtPath(p: string) {
  return p
    .replaceAll(path.posix.sep, path.sep)
    .replaceAll(path.win32.sep, path.sep)
}

export function splitPath(p: string) {
  return p.split(path.sep)
}

export async function getPathContents(p: string) {
  return await fs.readFile(fmtPath(p), 'utf8')
}

export async function getPathStat(p: string) {
  try {
    return await fs.stat(fmtPath(p))
  } catch {
    return undefined
  }
}

export async function getFilePath(parts: Array<string>) {
  return fmtPath(path.join(...parts))
}

export async function getFilePaths(
  parts: Array<string>,
  filters?: Array<string>,
) {
  return getFilePathsInPath(await getFilePath(parts), filters)
}

export async function getFilePathsInPath(
  fsPath: string,
  filters?: Array<string>,
) {
  const fmtFsPath = fmtPath(fsPath)

  let filePaths: Array<string> = []

  const stat = await getPathStat(fmtFsPath)
  if (!stat) {
    return filePaths
  }

  if (stat.isDirectory()) {
    for (const fsSubPath of await fs.readdir(fmtFsPath)) {
      filePaths.push(
        ...(await getFilePathsInPath(path.join(fmtFsPath, fmtPath(fsSubPath)))),
      )
    }
  } else {
    filePaths.push(fmtFsPath)
  }

  if (filters) {
    filePaths = filePaths.filter(p =>
      filters?.every(f => p.toLowerCase().includes(f)),
    )
  }

  return filePaths
}
