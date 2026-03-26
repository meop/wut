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

export async function getFilePaths(
  path: string,
  options?: {
    extension?: string
    filters?: Array<string>
    flexible?: boolean
  },
): Promise<Array<string>> {
  if (!(await isDirPath(path))) {
    return []
  }

  const patterns: Array<string> = []

  if (options?.filters?.length) {
    const prefix = options.flexible ? '**/' : ''
    const filterPattern = options.filters.map((f) => `*${f}*`).join('/')
    if (options?.extension) {
      patterns.push(`${prefix}${filterPattern}/**/*.${options.extension}`)
      patterns.push(`${prefix}${filterPattern}/*.${options.extension}`)
      patterns.push(`${prefix}${filterPattern}.${options.extension}`)
    } else {
      patterns.push(`${prefix}${filterPattern}/**`)
      patterns.push(`${prefix}${filterPattern}`)
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
