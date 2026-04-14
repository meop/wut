import type { Ctx } from '@meop/shire/ctx'
import { Fmt, parse } from '@meop/shire/serde'
import { join } from '@std/path'

import { getFileContent, getFilePaths, isDirPath, isPath } from './fs.ts'
import { toRelParts } from './path.ts'
import { SETTINGS } from './stng.ts'

export type CtxFilter = {
  [key: string]: CtxFilter | Array<string>
}

const cfgBasePath = SETTINGS.cfg.dir.startsWith('/')
  ? SETTINGS.cfg.dir
  : join(import.meta.dirname ?? '', '..', SETTINGS.cfg.dir)

function cfgPath(parts: Array<string>, extension?: string) {
  return `${join(cfgBasePath, ...parts)}${extension ? `.${extension}` : ''}`
}

export async function localCfgPaths(parts: Array<string>, extension?: string) {
  const maybeCfgPath = cfgPath(parts, extension)
  if (await isPath(maybeCfgPath)) {
    return [maybeCfgPath]
  }
  return []
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
  const dirPath = cfgPath(parts)
  if (!(await isDirPath(dirPath))) {
    return []
  }

  const dirFileParts = (
    await getFilePaths(dirPath, {
      extension: options?.extension,
      filters: options?.filters ?? undefined,
      flexible: options?.flexible,
    })
  ).map((p) => toRelParts(dirPath, p))

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
  const contentRaw = await getFileContent((await localCfgPaths(parts, options?.extension))[0] ?? '')
  if (contentRaw == null) {
    return null
  }
  return parse(
    contentRaw,
    options?.extension as Fmt ?? Fmt.yaml,
  )
}
