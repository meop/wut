export type HostGroups = Record<string, Array<string>>

export async function resolveHostGroupGates<T>(value: T, load: () => Promise<unknown>): Promise<T> {
  let groups: Promise<HostGroups> | undefined
  const loadGroups = async (): Promise<HostGroups> => {
    const content = await load()
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      throw new Error('host.yaml must define host groups')
    }
    for (const [name, hosts] of Object.entries(content)) {
      if (!Array.isArray(hosts) || !hosts.every((host) => typeof host === 'string' && host.length > 0)) {
        throw new Error(`invalid host group: ${name}`)
      }
    }
    return content as HostGroups
  }
  const visit = async (node: unknown): Promise<unknown> => {
    if (Array.isArray(node)) {
      return await Promise.all(node.map(visit))
    }
    if (!node || typeof node !== 'object') {
      return node
    }
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'sys_host_group') {
        result[key] = await visit(child)
      }
    }
    if ('sys_host_group' in node) {
      const names = node.sys_host_group
      if (!Array.isArray(names) || !names.every((name) => typeof name === 'string')) {
        throw new Error('sys_host_group must be a list of host group names')
      }
      const catalog = await (groups ??= loadGroups())
      const hosts = new Set<string>()
      for (const name of names) {
        if (!Object.hasOwn(catalog, name)) {
          throw new Error(`unknown host group: ${name}`)
        }
        for (const host of catalog[name]) {
          hosts.add(host)
        }
      }
      if ('sys_host' in result) {
        const explicit = result.sys_host
        if (!Array.isArray(explicit) || !explicit.every((host) => typeof host === 'string')) {
          throw new Error('sys_host must be a list of hostnames')
        }
        result.sys_host = explicit.filter((host) => hosts.has(host))
      } else {
        result.sys_host = [...hosts]
      }
    }
    return result
  }
  return await visit(value) as T
}
