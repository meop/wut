import { buildFilePath, getFileContent, getFilePaths, toRelParts } from './path'
import { Fmt, fromCfg, toCon } from './serde'

const cfgDirPath = buildFilePath(
  import.meta.dir,
  '..',
  '..',
  '..',
  'wut-config',
)

function localCfgPath(parts: Array<string>) {
  return `${buildFilePath(...[cfgDirPath, ...parts])}`
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

export async function getCfgFsDirDump(
  parts: () => Promise<Array<string>>,
  options?: {
    content?: boolean
    filters?: () => Promise<Array<string>>
    format?: Fmt
    name?: boolean
  },
) {
  const dirPath = localCfgPath(await parts())
  const filePaths = await getFilePaths(dirPath, {
    filters: options?.filters ? await options.filters() : undefined,
  })
  const lines: Array<string> = []
  for (const filePath of filePaths) {
    if (options?.name) {
      lines.push(toRelParts(dirPath, filePath).join(' '))
    }
    if (options?.content) {
      lines.push('<<<<<<<')
      lines.push(toCon(await fromFilePath(filePath), options?.format))
      lines.push('>>>>>>>')
    }
  }
  return lines.map(l => l.trimEnd())
}

export async function getCfgFsFileDump(
  parts: () => Promise<Array<string>>,
  ext?: string,
  options?: {
    content?: boolean
    format?: Fmt
    name?: boolean
  },
) {
  const filePath = `${localCfgPath(await parts())}${ext ? `.${ext}` : ''}`
  const lines: Array<string> = []
  if (options?.name) {
    lines.push(toRelParts(cfgDirPath, filePath).pop() ?? '')
  }
  if (options?.content) {
    lines.push('<<<<<<<')
    lines.push(toCon(await fromFilePath(filePath), options?.format))
    lines.push('>>>>>>>')
  }
  return lines.map(l => l.trimEnd())
}

export async function getCfgFsFileContent(
  parts: () => Promise<Array<string>>,
  ext?: string,
) {
  return await getFileContent(
    `${localCfgPath(await parts())}${ext ? `.${ext}` : ''}`,
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
