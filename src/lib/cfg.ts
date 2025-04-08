import { buildFilePath, getFileContent, getFilePaths, toRelParts } from './path'
import { Fmt, fromCfg, toCon } from './serde'

const cfgDirPath = buildFilePath(
  import.meta.dir,
  '..',
  '..',
  '..',
  'wut-config',
)

function localCfgDir(parts: Array<string>) {
  return `${buildFilePath(...[cfgDirPath, ...parts])}`
}

export async function getCfgFsDirLoad(
  parts: () => Promise<Array<string>>,
  options?: {
    filters?: () => Promise<Array<string>>
  },
): Promise<Array<string>> {
  const dirPath = localCfgDir(await parts())
  const filePaths = await getFilePaths(dirPath, {
    filters: options?.filters ? await options.filters() : undefined,
  })
  const lines: Array<string> = []
  for (const path of filePaths) {
    lines.push(await getFileContent(path))
  }
  return lines
}

async function fromFilePath(filePath: string) {
  const content = await getFileContent(filePath)
  return fromCfg(
    content,
    filePath.endsWith(Fmt.yaml)
      ? Fmt.yaml
      : filePath.endsWith(Fmt.json)
        ? Fmt.json
        : Fmt.text,
  )
}

export async function getCfgFsDirPrint(
  parts: () => Promise<Array<string>>,
  options?: {
    content?: boolean
    filters?: () => Promise<Array<string>>
    format?: Fmt
    name?: boolean
  },
): Promise<Array<string>> {
  const dirPath = localCfgDir(await parts())
  const filePaths = await getFilePaths(dirPath, {
    filters: options?.filters ? await options.filters() : undefined,
  })
  console.log(filePaths)
  const lines: Array<string> = []
  for (const filePath of filePaths) {
    if (options?.name) {
      lines.push(toRelParts(dirPath, filePath).join(' '))
    }
    if (options?.content) {
      lines.push(toCon(await fromFilePath(filePath), options?.format))
    }
  }
  return lines
}

export async function getCfgFsFileLoad(
  parts: () => Promise<Array<string>>,
  ext?: string,
): Promise<string> {
  const filePath = `${localCfgDir(await parts())}${ext ? `.${ext}` : ''}`
  return await getFileContent(filePath)
}

export async function getCfgFsFilePrint(
  parts: () => Promise<Array<string>>,
  ext?: string,
  options?: {
    content?: boolean
    format?: Fmt
    name?: boolean
  },
): Promise<Array<string>> {
  const filePath = `${localCfgDir(await parts())}.${ext ? `.${ext}` : ''}`
  const lines: Array<string> = []
  if (options?.name) {
    lines.push(toRelParts(cfgDirPath, filePath).join(' '))
  }
  if (options?.content) {
    lines.push(toCon(await fromFilePath(filePath), options?.format))
  }
  return lines
}
