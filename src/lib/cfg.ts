import { getPathContents, getPathStat, getFilePath, getFilePaths } from './path'
import { fromConfig } from './serde'

function cfgParts(parts: Array<string>) {
  return [import.meta.dir, '..', '..', '..', 'wut-config', ...parts]
}

export function getCfgFilePath(parts?: Array<string>) {
  return getFilePath(cfgParts(parts ?? []))
}

export async function getCfgFilePaths(
  parts?: Array<string>,
  filters?: Array<string>,
) {
  return await getFilePaths([getCfgFilePath(parts)], filters)
}

export async function loadCfgFileContents(fsPath: string) {
  if (!fsPath || !(await getPathStat(fsPath))) {
    return {}
  }

  return fromConfig(await getPathContents(fsPath))
}
