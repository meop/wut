import type { Ctx } from './ctx'
import {
  buildFilePath,
  getFileContent,
  getFilePaths,
  isDir,
  toRelParts,
} from './path'
import { Fmt, fromCfg } from './serde'

const cfgDirPath = buildFilePath(
  import.meta.dir,
  '..',
  '..',
  'wut-config',
  'cfg',
)

export function localCfgPath(parts: Array<string>) {
  return `${buildFilePath(...[cfgDirPath, ...parts])}`
}

export async function getCfgFsDirDump(
  parts: () => Promise<Array<string>>,
  options?: {
    context?: Ctx
    contextFilter?: unknown
    extension?: Fmt
    filters?: () => Promise<Array<string>>
  },
) {
  const _parts = await parts()
  const dirPath = localCfgPath(_parts)
  const dirParts = (
    await getFilePaths(dirPath, {
      extension: options?.extension,
      filters: options?.filters ? await options.filters() : undefined,
    })
  ).map(p => toRelParts(dirPath, p).map(l => l.trimEnd()))
  if (options?.context && options.contextFilter) {
    const dirPartsFiltered: Array<Array<string>> = []
    for (const fileParts of dirParts) {
      let listPartsPtr = options.contextFilter
      let valid = true
      let found = true
      for (const key of fileParts) {
        if (typeof listPartsPtr === 'object' && !(key in listPartsPtr)) {
          found = false
          break
        }
        listPartsPtr = listPartsPtr[key]
      }
      if (!found) {
        dirPartsFiltered.push(fileParts)
        continue
      }
      for (const key of Object.keys(listPartsPtr)) {
        if (
          !(key in options.context) ||
          !listPartsPtr[key].includes(options.context[key])
        ) {
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
  parts: () => Promise<Array<string>>,
  options?: {
    context?: Ctx
    contextFilter?: unknown
    extension?: Fmt
    filters?: () => Promise<Array<string>>
  },
) {
  const _parts = await parts()
  const dirPath = localCfgPath(_parts)
  const contents: Array<string> = []
  if (!(await isDir(dirPath))) {
    return contents
  }
  const dirParts = await getCfgFsDirDump(parts, options)
  for (const fileParts of dirParts) {
    const content = await getCfgFsFileLoad(
      async () => [..._parts, ...fileParts],
      options,
    )
    if (content != null) {
      contents.push(content)
    }
  }
  return contents
}

export async function getCfgFsFileContent(
  parts: () => Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const _parts = await parts()
  return await getFileContent(
    `${localCfgPath(_parts)}${options?.extension ? `.${options.extension}` : ''}`,
  )
}

export async function getCfgFsFileDump(
  parts: () => Promise<Array<string>>,
  options?: {
    extension?: Fmt
  },
) {
  const _parts = await parts()
  return toRelParts(
    cfgDirPath,
    `${localCfgPath(_parts)}${options?.extension ? `.${options.extension}` : ''}`,
  ).map(l => l.trimEnd())
}

export async function getCfgFsFileLoad(
  parts: () => Promise<Array<string>>,
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
