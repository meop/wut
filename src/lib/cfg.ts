import { buildFilePath, getFileText } from './path'
import { Fmt, fromConfig } from './serde'

function cfgParts(parts: Array<string>) {
  return [import.meta.dir, '..', '..', '..', 'wut-config', ...parts]
}

export function buildCfgFilePath(parts: Array<string>) {
  return buildFilePath(cfgParts(parts))
}

export async function loadCfgFileContents(
  filePath: string,
  format: Fmt = Fmt.yaml,
) {
  return fromConfig(await getFileText(filePath), format)
}
