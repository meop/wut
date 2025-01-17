import { join as pathJoin } from 'path'
import { parse as yamlParse } from 'yaml'

import { getPathContents, getPathStat, getFilePathsInPath } from './path.ts'

export async function findConfigFilePaths(
  cmd: string,
  ...parts: Array<string>
) {
  const dirPath = pathJoin(
    ...[process.env['WUT_CONFIG_LOCATION'] ?? '', cmd, ...parts],
  )
  return await getFilePathsInPath(dirPath)
}

export async function loadConfigFile(fsPath: string) {
  if (!fsPath || !(await getPathStat(fsPath))) {
    return {}
  }

  return yamlParse(await getPathContents(fsPath))
}
