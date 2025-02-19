import { getFilePath, getFilePaths } from './path'

export function getBaseFilePath(parts?: Array<string>) {
  return getFilePath([process.env.WUT_LOCATION ?? '', ...(parts ?? [])])
}

export async function getBaseFilePaths(
  parts?: Array<string>,
  filters?: Array<string>,
) {
  return await getFilePaths([getBaseFilePath(parts)], filters)
}
