import { deepMerge } from '@cross/deepmerge'
import type { Ctx } from '@meop/shire/ctx'
import { Fmt, parse } from '@meop/shire/serde'
import { join } from '@std/path'

import { getFileContent, getFilePaths, isDirPath, isPath } from './fs.ts'
import { toRelParts } from './path.ts'
import { SETTINGS } from './stng.ts'

export type CtxFilter = {
  [key: string]: CtxFilter | Array<string>
}

const cfgDirPaths = [
  join(import.meta.dirname ?? '', '..', 'cfg'),
  ...SETTINGS.cfg.dirs.map((dir) => join(import.meta.dirname ?? '', '..', '..', dir, 'cfg')),
].reverse()

export async function localCfgPaths(parts: Array<string>, extension?: string) {
  const validDirs: Array<string> = []
  const validCfgPaths: Array<string> = []

  for (const maybeDir of cfgDirPaths) {
    if (await isDirPath(maybeDir)) {
      validDirs.push(maybeDir)
    }
  }

  for (const validDir of validDirs) {
    const maybeCfgPath = `${join(validDir, ...parts)}${extension ? `.${extension}` : ''}`
    if (await isPath(maybeCfgPath)) {
      validCfgPaths.push(maybeCfgPath)
    }
  }
  return validCfgPaths
}

export async function getCfgDirDump(
  parts: Array<string>,
  options?: {
    context?: Ctx
    contextFilter?: CtxFilter
    extension?: string
    filters?: Array<string>
    flexible?: boolean
  },
) {
  const dirFileParts: Array<Array<string>> = []
  for (const dirPath of await localCfgPaths(parts)) {
    if (!(await isDirPath(dirPath))) {
      continue
    }
    dirFileParts.push(...(
      await getFilePaths(dirPath, {
        extension: options?.extension,
        filters: options?.filters ?? undefined,
        flexible: options?.flexible,
      })
    ).map((p) => toRelParts(dirPath, p)))
  }

  if (options?.context && options.contextFilter) {
    const dirFilePartsFiltered: Array<Array<string>> = []
    for (const fileParts of dirFileParts) {
      let contextFilterPtr = options.contextFilter
      let valid = true
      let found = true
      for (const key of fileParts) {
        if (
          typeof contextFilterPtr === 'object' &&
          !(key in contextFilterPtr)
        ) {
          found = false
          break
        }
        contextFilterPtr = contextFilterPtr[key] as CtxFilter
      }
      if (!found) {
        dirFilePartsFiltered.push(fileParts)
        continue
      }
      for (const key of Object.keys(contextFilterPtr) as Array<keyof Ctx>) {
        const contextKey = options.context[key]
        const contextFilterValue = contextFilterPtr[key] as Array<string>

        if (!contextKey) {
          valid = false
          break
        }
        const matches = key === 'sys_os_like'
          ? contextFilterValue.some((v) => contextKey.includes(v))
          : contextFilterValue.includes(contextKey)
        if (!matches) {
          valid = false
          break
        }
      }
      if (valid) {
        dirFilePartsFiltered.push(fileParts)
      }
    }
    return dirFilePartsFiltered
  }
  return dirFileParts
}

export async function getCfgDirContent(
  parts: Array<string>,
  options?: {
    context?: Ctx
    contextFilter?: CtxFilter
    extension?: string
    filters?: Array<string>
    flexible?: boolean
  },
) {
  const contents: Array<string> = []
  const dirFileParts = await getCfgDirDump(parts, options)
  for (const fileParts of dirFileParts) {
    const content = await getCfgFileContent(
      [...parts, ...fileParts],
      options,
    )
    if (content != null) {
      contents.push(content)
    }
  }
  return contents
}

export async function getCfgFileContent(
  parts: Array<string>,
  options?: {
    extension?: string
  },
) {
  return await getFileContent(
    (await localCfgPaths(parts, options?.extension))[0] ?? '',
  )
}

export async function getCfgFileLoad(
  parts: Array<string>,
  options?: {
    extension?: string
  },
) {
  // deno-lint-ignore no-explicit-any
  let content: any = null

  for (const localCfgPath of (await localCfgPaths(parts, options?.extension))) {
    const contentRaw = await getFileContent(localCfgPath)
    if (contentRaw != null) {
      const contentRawFmt = parse(
        contentRaw,
        options?.extension as Fmt ?? Fmt.yaml,
      )
      if (content == null) {
        content = contentRawFmt
      } else {
        content = deepMerge(content, contentRawFmt)
      }
    }
  }

  return content
}
