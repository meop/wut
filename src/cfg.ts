import type { Ctx, CtxFilter } from './ctx.ts'
import {
  buildFilePath,
  getFileContent,
  getFilePaths,
  isDir,
  isFile,
  toRelParts,
} from './path.ts'
import { Fmt, fromCfg } from './serde.ts'

const cfgDirPath = buildFilePath(
  import.meta.dirname ?? '',
  '..',
  '..',
  'wut-config',
  'cfg',
)

export function localCfgPath(parts: Array<string>) {
  return `${buildFilePath(...[cfgDirPath, ...parts])}`
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
  const dirPath = localCfgPath(_parts)
  const dirParts = (
    await getFilePaths(dirPath, {
      extension: options?.extension,
      filters: options?.filters ? await options.filters : undefined,
    })
  ).map(p => toRelParts(dirPath, p))
  if (options?.context && options.contextFilter) {
    const dirPartsFiltered: Array<Array<string>> = []
    for (const fileParts of dirParts) {
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
        dirPartsFiltered.push(fileParts)
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
        dirPartsFiltered.push(fileParts)
      }
    }
    return dirPartsFiltered
  }
  return dirParts
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
  const dirPath = localCfgPath(_parts)
  const contents: Array<string> = []
  if (!(await isDir(dirPath))) {
    return contents
  }
  const dirParts = await getCfgFsDirDump(parts, options)
  for (const fileParts of dirParts) {
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

export async function isCfgFsFile(
  parts: Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const _parts = await parts
  return await isFile(
    `${localCfgPath(_parts)}${options?.extension ? `.${options.extension}` : ''}`,
  )
}

export async function getCfgFsFileContent(
  parts: Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  if (!(await isCfgFsFile(parts, options))) {
    return null
  }
  const _parts = await parts
  return await getFileContent(
    `${localCfgPath(_parts)}${options?.extension ? `.${options.extension}` : ''}`,
  )
}

export async function getCfgFsFileDump(
  parts: Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const _parts = await parts
  return toRelParts(
    cfgDirPath,
    `${localCfgPath(_parts)}${options?.extension ? `.${options.extension}` : ''}`,
  )
}

export async function getCfgFsFileLoad(
  parts: Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const content = await getCfgFsFileContent(parts, options)
  if (content == null) {
    return null
  }
  return fromCfg(content, options?.extension ?? Fmt.yaml)
}
