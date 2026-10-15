import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
import { partsMatch, sameName, wordStartsWith } from '../match.ts'
import { lockRun, redirectCommonShell } from '../sh.ts'

export class VirtCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'virt'
    this.description = 'virtual manager ops'
    this.aliases = ['v', 'vi', 'vir', 'virtual']
    this.commands = [
      new VirtCmdAdd([...this.scopes, this.name]),
      new VirtCmdFind([...this.scopes, this.name]),
      new VirtCmdList([...this.scopes, this.name]),
      new VirtCmdRem([...this.scopes, this.name]),
      new VirtCmdRun([...this.scopes, this.name]),
      new VirtCmdSync([...this.scopes, this.name]),
      new VirtCmdTidy([...this.scopes, this.name]),
    ]
  }
}

const sysOsPlatToManager: Record<string, Array<string>> = {
  linux: ['docker', 'lxc', 'podman', 'qemu'],
  darwin: [],
  windows: [],
}

// the others have no `run` arm, so a plan naming them would prompt and do nothing
const RUN_MANAGERS: Array<string> = ['qemu']

const VIRT_KEY = 'virt'
const VIRT_OP_KEY = [VIRT_KEY, 'op']
const VIRT_PODMAN_NETWORKS_KEY = [VIRT_KEY, 'podman', 'networks']
// the host's own limits.yaml, beside its manager folders: the qemu pool and the reserve step both read it
const VIRT_LIMITS_KEY = [VIRT_KEY, 'limits']
// config name -> the cores per socket it asks for, for the client's check before any add or sync
const VIRT_QEMU_WANTS_KEY = [VIRT_KEY, 'qemu', 'wants']
const VIRT_OP_PARTS_KEY = (op: string) => [VIRT_KEY, op, 'parts']

// manager -> instances, for the client to filter by what is here and run after one prompt
const VIRT_PLAN_KEY = [VIRT_KEY, 'plan']

// manager -> 'pod=instances' entries, filtered by what is here the same way
const VIRT_FIND_KEY = [VIRT_KEY, 'find']

function getSupportedManagers(context: Ctx) {
  const managers: Array<string> = []

  const sysOsPlat = context.sys_os_plat

  if (sysOsPlat) {
    managers.push(...(sysOsPlatToManager[sysOsPlat] ?? []))
  }

  return managers
}

// nu's virtDeepMerge: records merge, lists append, and anything else the later one wins
function deepMerge(base: unknown, over: unknown): unknown {
  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v != null && !Array.isArray(v)
  if (isRecord(base) && isRecord(over)) {
    const merged: Record<string, unknown> = { ...base }
    for (const [k, v] of Object.entries(over)) {
      merged[k] = k in base ? deepMerge(base[k], v) : v
    }
    return merged
  }
  if (Array.isArray(base) && Array.isArray(over)) {
    return [...base, ...over]
  }
  return over
}

// the cores per socket a qemu config asks for, under the architecture its own environment names, as the client reads it
function qemuWantsCores(config: unknown): number | undefined {
  const c = config as {
    environment?: Array<string>
    qemu?: { architecture?: Record<string, { cpu?: { cores?: number } }> }
  }
  const arch = (c?.environment ?? []).filter((e) => e.startsWith('vm_sys_arch=')).map((e) => e.split('=')[1]).at(-1)
  return arch ? c?.qemu?.architecture?.[arch]?.cpu?.cores : undefined
}

// the cores per socket each qemu config for the host asks for, variants only where they set their own. the client
// checks them against the cores it has before any virt add or sync, since the server cannot see the host
export function qemuWants(configs: Array<[string, unknown]>): Record<string, number> {
  const wanted = new Map(configs.map(([name, config]) => [name, qemuWantsCores(config)]))
  const wants: Record<string, number> = {}
  for (const [name, cores] of wanted) {
    const inherited = name.includes('/') && wanted.get(name.split('/')[0]) === cores
    if (cores != null && !inherited) {
      wants[name] = cores
    }
  }
  return wants
}

// each config merged as the client merges it: the shared qemu.yaml, the instance, then a variant
async function loadQemuConfigs(dirParts: Array<string>): Promise<Array<[string, unknown]>> {
  const load = (parts: Array<string>) => getCfgFileLoad(parts, { extension: Fmt.yaml })
  const base = await load([VIRT_KEY, 'qemu'])
  const found = (await getCfgDirDump([...dirParts, 'qemu'], { extension: Fmt.yaml })).filter((p) => p.length)
  const configs: Array<[string, unknown]> = []
  for (const parts of found) {
    let merged = deepMerge(base ?? {}, (await load([...dirParts, 'qemu', parts[0]])) ?? {})
    if (parts.length > 1) {
      merged = deepMerge(merged, (await load([...dirParts, 'qemu', ...parts])) ?? {})
    }
    configs.push([parts.join('/'), merged])
  }
  return configs
}

function buildAndLog(shell: Sh, environment: Env) {
  const body = shell.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

async function execOp(shell: Sh, context: Ctx, environment: Env, op: string) {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  let _shell = shell.with(shell.varSetStr(VIRT_OP_KEY, op))
  const supportedManagers = op === 'run'
    ? getSupportedManagers(context).filter((m) => RUN_MANAGERS.includes(m))
    : getSupportedManagers(context)

  const dirParts = [VIRT_KEY, context.sys_host ?? '']
  const filters = environment.getSplit(VIRT_OP_PARTS_KEY(op))

  if (op === 'find') {
    // find needs virt.nu too now that it asks the client which managers are here; the per manager files it
    // does not, since it never calls one
    _shell = _shell
      .with(await _shell.fileLoad(['sel'], import.meta.resolve, ['..']))
      .with(await _shell.fileLoad([VIRT_KEY], import.meta.resolve, ['..']))

    const allResults = await getCfgDirDump(dirParts, { extension: Fmt.yaml })

    const grouped = new Map<string, Map<string, string[]>>()
    for (const r of allResults) {
      if (!supportedManagers.includes(r[0])) {
        continue
      }
      // the manager is part of the path everywhere else (add, rem, list), so it filters here too
      // against the whole path, so a variant's name finds its instance
      if (filters.length > 0 && !partsMatch(r, filters, 'words')) {
        continue
      }
      const manager = r[0]
      const pod = r[1]
      const instance = r[2]

      if (!grouped.has(manager)) {
        grouped.set(manager, new Map())
      }
      const managerGroup = grouped.get(manager)!

      if (manager === 'podman') {
        if (!managerGroup.has(pod)) {
          managerGroup.set(pod, [])
        }
        if (instance) {
          managerGroup.get(pod)!.push(instance)
        }
      } else {
        if (pod) {
          if (!managerGroup.has('')) {
            managerGroup.set('', [])
          }
          // a variant is not another instance, so it lands on the name its own yaml already put here
          const instances = managerGroup.get('')!
          if (!instances.includes(pod)) {
            instances.push(pod)
          }
        }
      }
    }

    // data, not printed lines: whether a manager is on this machine is the client's to answer, the same way
    // virtPlanRun decides it for every other op
    const findMap: Record<string, Array<string>> = {}
    for (
      const [manager, podMap] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))
    ) {
      findMap[manager] = [...podMap.entries()]
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([pod, instances]) => `${pod}=${instances.toSorted().join(',')}`)
    }
    if (Object.keys(findMap).length) {
      _shell = _shell
        .with(_shell.varSetStr(VIRT_FIND_KEY, JSON.stringify(findMap)))
        .with(['virtFindRun'])
    }
  } else {
    _shell = _shell
      .with(await _shell.fileLoad(['sel'], import.meta.resolve, ['..']))
      .with(await _shell.fileLoad(['match'], import.meta.resolve, ['..']))
      .with(
        await _shell.fileLoad(
          [VIRT_KEY],
          import.meta.resolve,
          ['..'],
        ),
      )

    for (const supportedManager of supportedManagers) {
      _shell = _shell.with(
        await _shell.fileLoad(
          [VIRT_KEY, supportedManager],
          import.meta.resolve,
          ['..'],
        ),
      )
    }

    if (supportedManagers.includes('podman')) {
      const podmanConfig = await getCfgFileLoad([VIRT_KEY, 'podman'], {
        extension: Fmt.yaml,
      })
      const networks = podmanConfig?.podman?.networks ?? {}
      _shell = _shell.with(
        _shell.varSetStr(VIRT_PODMAN_NETWORKS_KEY, JSON.stringify(networks)),
      )
    }

    if (supportedManagers.includes('qemu')) {
      const limits = await getCfgFileLoad([...dirParts, 'limits'], { extension: Fmt.yaml })
      if (op === 'add' || op === 'sync') {
        _shell = _shell.with(
          _shell.varSetStr(VIRT_QEMU_WANTS_KEY, JSON.stringify(qemuWants(await loadQemuConfigs(dirParts)))),
        )
      }
      _shell = _shell.with(
        _shell.varSetStr(VIRT_LIMITS_KEY, JSON.stringify(limits ?? {})),
      )
    }

    // the plan is data: which manager takes which instances. whether that manager is on this machine, and the one
    // decision about all of it, are the client's
    // run is a foreground session that claims nothing, so it takes no lock
    const planRun = op === 'run' ? ['virtPlanRun'] : await lockRun(_shell, VIRT_KEY, ['virtPlanRun'])
    const applyResults = (results: Array<Array<string>>) => {
      const virtMap: Record<string, Array<string>> = {}
      for (const parts of results) {
        if (!parts[1] || (parts[0] === 'podman' && !parts[2])) {
          continue
        }
        if (!supportedManagers.includes(parts[0])) {
          continue
        }
        ;(virtMap[parts[0]] ??= []).push(parts.slice(1).join('/'))
      }
      const applied = Object.keys(virtMap).length
      if (applied) {
        _shell = _shell
          .with(_shell.varSetStr(VIRT_PLAN_KEY, JSON.stringify(virtMap)))
          .with(planRun)
      }
      return applied
    }

    if (op === 'list') {
      // list reads, so it matches the way find does: a term that starts a manager's name picks the manager, and the
      // rest are left for the client to put to what is installed
      const managerFilters = filters.filter((f) => supportedManagers.some((m) => wordStartsWith(m, f)))
      const instanceFilters = filters.filter((f) => !managerFilters.includes(f))
      const managersToOp = managerFilters.length > 0
        ? supportedManagers.filter((m) => managerFilters.some((f) => wordStartsWith(m, f)))
        : supportedManagers
      // same plan-then-ask-once path as add/rem/sync/tidy, so listing across managers asks once too
      const virtMap: Record<string, Array<string>> = Object.fromEntries(
        managersToOp.map((m) => [m, instanceFilters]),
      )
      if (Object.keys(virtMap).length) {
        _shell = _shell
          .with(_shell.varSetStr(VIRT_PLAN_KEY, JSON.stringify(virtMap)))
          .with(['virtPlanRun'])
      }
    } else {
      // the acting ops take names whole: a manager, a pod or an instance as it is spelled, in any order
      let results = await getCfgDirDump(dirParts, { extension: Fmt.yaml, filters, match: 'exact' })
      if (op !== 'run') {
        const named = (part: string) => filters.some((f) => sameName(part, f))
        results = results.filter((parts) =>
          parts[0] === 'podman' || parts.length <= 2 || (op === 'add' && named(parts[2]) && named(parts[1]))
        )
      }
      // one foreground run, so the first of what was named: the instance itself sorts ahead of its variants
      if (op === 'run' && filters.length) {
        results = results
          .filter((parts) => parts[1] && !(parts[0] === 'podman' && !parts[2]))
          .slice(0, 1)
      }
      const applied = applyResults(results)
      if (!applied && filters.length) {
        _shell = _shell.with(_shell.printWarn(`no instance matched: ${filters.join(' ')}`))
      }
    }
  }

  return buildAndLog(_shell, environment)
}

export class VirtCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.description = 'add on local'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [
      { name: 'parts', description: 'path part(s) to match', required: true },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class VirtCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class VirtCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.description = 'list on local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class VirtCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.description = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'unin', 'uninstall']
    this.arguments = [
      { name: 'parts', description: 'path part(s) to match', required: true },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class VirtCmdRun extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'run'
    this.description = 'run ad-hoc in foreground (no service)'
    this.aliases = ['ru']
    this.arguments = [
      { name: 'parts', description: 'path part(s) to match', required: true },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class VirtCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.description = 'sync from remote'
    this.aliases = ['s', 'sy', 'up', 'update']
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}

export class VirtCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.description = 'tidy on local'
    this.aliases = ['t', 'ti', 'cl', 'clean']
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment, this.name)
  }
}
