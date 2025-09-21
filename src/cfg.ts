import process from 'node:process'

import { deepMerge } from '@cross/deepmerge'
import type { Ctx, CtxFilter } from '@meop/shire/ctx'
import {
  buildFilePath,
  getFileContent,
  getFilePaths,
  isDirPath,
  isPath,
} from '@meop/shire/path'
import { Fmt, parse } from '@meop/shire/serde'

import { toRelParts } from './path.ts'

const cfgDirPaths = (process.env['WUT_CFG_DIRS'] ?? 'wut').split(',').map((
  dir,
) =>
  buildFilePath(
    import.meta.dirname ?? '',
    '..',
    '..',
    dir,
    'cfg',
  )
)

export function localCfgPaths(parts: Array<string>) {
  return cfgDirPaths.map((c) => `${buildFilePath(...[c, ...parts])}`)
}

export async function getCfgFsDirDump(
  parts: Promise<Array<string>>,
  options?: {
    context?: Ctx
    contextFilter?: CtxFilter
    extension?: Fmt
    filters?: Promise<Array<string>>
  },
) {
  const _parts = await parts
  const dirFileParts: Array<Array<string>> = []
  for (const dirPath of localCfgPaths(_parts)) {
    if (!(await isDirPath(dirPath))) {
      continue
    }
    dirFileParts.push(...(
      await getFilePaths(dirPath, {
        extension: options?.extension,
        filters: options?.filters ? await options.filters : undefined,
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

        if (!contextKey || !contextFilterValue.includes(contextKey)) {
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

export async function getCfgFsDirLoad(
  parts: Promise<Array<string>>,
  options?: {
    context?: Ctx
    contextFilter?: CtxFilter
    extension?: Fmt
    filters?: Promise<Array<string>>
  },
) {
  const _parts = await parts
  const contents: Array<string> = []
  const dirFileParts = await getCfgFsDirDump(parts, options)
  for (const fileParts of dirFileParts) {
    const content = await getCfgFsFileLoad(
      Promise.resolve([..._parts, ...fileParts]),
      options,
    )
    if (content != null) {
      contents.push(content)
    }
  }
  return contents
}

export async function getCfgFsFileContent(
  parts: Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const _parts = await parts
  for (const cfgPath of localCfgPaths(_parts).reverse()) {
    if (
      await isPath(
        `${cfgPath}${options?.extension ? `.${options.extension}` : ''}`,
      )
    ) {
      return await getFileContent(cfgPath)
    }
  }
}

export async function getCfgFsFileLoad(
  parts: Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const _parts = await parts
  // deno-lint-ignore no-explicit-any
  let content: any

  for (const filePath of localCfgPaths(_parts)) {
    const contentRaw = await getFileContent(
      `${filePath}${options?.extension ? `.${options.extension}` : ''}`,
    )
    if (contentRaw != null) {
      const contentRawFmt = parse(contentRaw, options?.extension ?? Fmt.yaml)
      if (content == null) {
        content = contentRawFmt
      } else {
        content = deepMerge(content, contentRawFmt)
      }
    }
  }

  return content
}
