import { parse as yamlParse } from 'yaml'

import path from 'node:path'

import {
  fmtPath,
  getPathContents,
  getPathStat,
  getFilePathsInPath,
} from './path'

export function getCfgFileName(fsPath: string) {
  return path.parse(fsPath).name
}

export function getCfgFilePath(parts?: Array<string>) {
  return fmtPath(
    path.join(process.env.WUT_CONFIG_LOCATION ?? '', ...(parts ?? [])),
  )
}

export async function getCfgFilePaths(
  parts?: Array<string>,
  filters?: Array<string>,
) {
  let cfgPaths = await getFilePathsInPath(getCfgFilePath(parts))

  if (filters) {
    for (const filter of filters) {
      cfgPaths = cfgPaths.filter(p => p.toLowerCase().includes(filter))
    }
  }

  return cfgPaths
}

export async function loadCfgFileContents(fsPath: string) {
  if (!fsPath || !(await getPathStat(fsPath))) {
    return {}
  }

  return yamlParse(await getPathContents(fsPath))
}
