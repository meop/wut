import { buildFilePath, getFileContent, getFilePaths, toRelParts } from './path'
import { Fmt, fromCfg } from './serde'

const cfgDirPath = buildFilePath(import.meta.dir, '..', '..', 'wut-config')

export function localCfgPath(parts: Array<string>) {
  return `${buildFilePath(...[cfgDirPath, ...parts])}`
}

export async function getCfgFsDirDump(
  parts: () => Promise<Array<string>>,
  options?: {
    filters?: () => Promise<Array<string>>
  },
) {
  const dirPath = localCfgPath(await parts())
  return (
    await getFilePaths(dirPath, {
      filters: options?.filters ? await options.filters() : undefined,
    })
  ).map(p => toRelParts(dirPath, p).map(l => l.trimEnd()))
}

export async function getCfgFsFileDump(
  parts: () => Promise<Array<string>>,
  ext?: string,
) {
  return toRelParts(
    cfgDirPath,
    `${localCfgPath(await parts())}${ext ? `.${ext}` : ''}`,
  ).map(l => l.trimEnd())
}

export async function getCfgFsFileContent(
  parts: () => Promise<Array<string>>,
  ext?: string,
) {
  return await getFileContent(
    `${localCfgPath(await parts())}${ext ? `.${ext}` : ''}`,
  )
}

async function fromFilePath(filePath: string) {
  const content = await getFileContent(filePath)
  if (!content) {
    return null
  }

  return fromCfg(
    content,
    filePath.endsWith(Fmt.yaml)
      ? Fmt.yaml
      : filePath.endsWith(Fmt.json)
        ? Fmt.json
        : Fmt.text,
  )
}

export async function getCfgFsFileLoad(
  parts: () => Promise<Array<string>>,
  ext?: string,
) {
  return await fromFilePath(
    `${localCfgPath(await parts())}${ext ? `.${ext}` : ''}`,
  )
}
