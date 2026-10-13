import { expandGlob } from '@std/fs'

export async function isPath(path: string): Promise<boolean> {
  try {
    await Deno.stat(path)
    return true
  } catch (e) {
    if (e instanceof Deno.errors.NotFound || e instanceof Deno.errors.PermissionDenied) {
      return false
    }
    throw e
  }
}

export async function isDirPath(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isDirectory
  } catch (e) {
    if (e instanceof Deno.errors.NotFound || e instanceof Deno.errors.PermissionDenied) {
      return false
    }
    throw e
  }
}

export async function isFilePath(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isFile
  } catch (e) {
    if (e instanceof Deno.errors.NotFound || e instanceof Deno.errors.PermissionDenied) {
      return false
    }
    throw e
  }
}

export async function getFileContent(path: string): Promise<string | null> {
  if (!(await isFilePath(path))) {
    return null
  }
  try {
    return await Deno.readTextFile(path)
  } catch (e) {
    if (e instanceof Deno.errors.NotFound || e instanceof Deno.errors.PermissionDenied) {
      return null
    }
    throw e
  }
}

export async function getFileBinaryContent(path: string): Promise<ArrayBuffer | null> {
  if (!(await isFilePath(path))) {
    return null
  }
  try {
    return (await Deno.readFile(path)).buffer as ArrayBuffer
  } catch (e) {
    if (e instanceof Deno.errors.NotFound || e instanceof Deno.errors.PermissionDenied) {
      return null
    }
    throw e
  }
}

export async function getFilePaths(
  path: string,
  options?: {
    extension?: string
  },
): Promise<Array<string>> {
  if (!(await isDirPath(path))) {
    return []
  }

  const patterns = options?.extension ? [`**/*.${options.extension}`, `*.${options.extension}`] : ['**', '*']

  const filePaths: Set<string> = new Set()
  for (const pattern of patterns) {
    for await (const entry of expandGlob(pattern, { root: path })) {
      if (entry.isFile) {
        filePaths.add(entry.path)
      }
    }
  }

  return [...filePaths].sort()
}
