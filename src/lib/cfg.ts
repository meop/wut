import { buildFilePath, getFileText } from './path'
import { Fmt, fromCfg } from './serde'

function cfgParts(...parts: Array<string>) {
  return [import.meta.dir, '..', '..', '..', 'wut-config', ...parts]
}

export function buildCfgFilePath(...parts: Array<string>) {
  return buildFilePath(...cfgParts(...parts))
}

export async function loadCfgFileContents(
  filePath: string,
  format: Fmt = Fmt.yaml,
) {
  return fromCfg(await getFileText(filePath), format)
}
