import { parse as yamlParse } from 'yaml'

import { getPathContents, getPathStat, getFilePath, getFilePaths } from './path'

export function getCfgFilePath(parts?: Array<string>) {
  return getFilePath([process.env.WUT_CONFIG_LOCATION ?? '', ...(parts ?? [])])
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

  return yamlParse(await getPathContents(fsPath))
}
