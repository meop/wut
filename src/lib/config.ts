import { join as pathJoin } from 'path'
import { parse as yamlParse } from 'yaml'
import { promises as fsPromises } from 'fs'

import { doesPathExist } from './path.ts'

export async function buildConfigFilePath(
  cmd: string,
  name: string,
  tool?: string,
): Promise<string> {
  const pathParts: Array<string> = []
  pathParts.push(process.env['WUT_CONFIG_LOCATION'] ?? '')
  pathParts.push(cmd)
  if (tool) {
    pathParts.push(tool)
  }
  pathParts.push(`${name}.yaml`)

  const path = pathJoin(...pathParts)

  return path
}

export async function loadConfigFilePath(
  cmd: string,
  name: string,
  tool?: string,
): Promise<any> {
  const path = await buildConfigFilePath(cmd, name, tool)

  if (!(await doesPathExist(path))) {
    return {}
  }

  const file = await fsPromises.readFile(path, { encoding: 'utf8' })
  return yamlParse(file)
}
