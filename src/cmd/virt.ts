import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
import { redirectCommonShell } from '../sh.ts'

export class VirtCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'virt'
    this.description = 'virtual manager ops'
    this.aliases = ['v', 'vi', 'vir', 'virtual']
    this.options = [
      { keys: ['-m', '--manager'], description: 'manager to use' },
    ]
    this.commands = [
      new VirtCmdAdd([...this.scopes, this.name]),
      new VirtCmdFind([...this.scopes, this.name]),
      new VirtCmdList([...this.scopes, this.name]),
      new VirtCmdRem([...this.scopes, this.name]),
      new VirtCmdSync([...this.scopes, this.name]),
      new VirtCmdTidy([...this.scopes, this.name]),
    ]
  }
}

const sysOsPlatToManager: Record<string, Array<string>> = {
  linux: ['docker', 'podman', 'lxc', 'qemu'],
  darwin: ['docker', 'podman', 'qemu'],
  winnt: [],
}

const VIRT_KEY = 'virt'
const VIRT_MANAGER_KEY = [VIRT_KEY, 'manager']
const VIRT_OP_KEY = [VIRT_KEY, 'op']
const VIRT_PODMAN_NETWORKS_KEY = [VIRT_KEY, 'podman', 'networks']
const VIRT_OP_PARTS_KEY = (op: string) => [VIRT_KEY, op, 'parts']

const VIRT_INSTANCES_KEY = [VIRT_KEY, 'instances']

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const sysOsPlat = context.sys_os_plat

  if (sysOsPlat) {
    managers.push(...(sysOsPlatToManager[sysOsPlat] ?? []))
  }
  if (environment.get(VIRT_MANAGER_KEY)) {
    managers = managers.filter((p) => p === environment.get(VIRT_MANAGER_KEY))
  }

  return managers
}

function getManagerFuncName(manager: string, prefix = VIRT_KEY) {
  return manager
    ? `${prefix}${manager[0].toUpperCase()}${manager.slice(1).replaceAll('-', '').replaceAll('_', '').toLowerCase()}`
    : ''
}

async function execOp(shell: Sh, context: Ctx, environment: Env, op: string) {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  let _shell = shell.with(shell.varSetStr(VIRT_OP_KEY, op))
  const supportedManagers = getSupportedManagers(context, environment)

  const dirParts = [VIRT_KEY, context.sys_host ?? '']
  const filters = environment.getSplit(VIRT_OP_PARTS_KEY(op))

  if (op === 'find') {
    const allResults = await getCfgDirDump(dirParts, {
      extension: Fmt.yaml,
      flexible: true,
    })

    const grouped = new Map<string, Map<string, string[]>>()
    for (const r of allResults) {
      if (!supportedManagers.includes(r[0])) {
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
          managerGroup.get('')!.push(pod)
        }
      }
    }

    const shellLines: string[] = []
    for (
      const [manager, podMap] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))
    ) {
      shellLines.push(..._shell.print(manager))
      for (
        const [pod, instances] of [...podMap.entries()].toSorted(([a], [b]) => a.localeCompare(b))
      ) {
        if (pod !== '') {
          shellLines.push(..._shell.print(`  ${pod}`))
          if (instances.length > 0) {
            shellLines.push(
              ..._shell.print(`    ${instances.toSorted().join(', ')}`),
            )
          }
        } else {
          if (instances.length > 0) {
            shellLines.push(
              ..._shell.print(`  ${instances.toSorted().join(', ')}`),
            )
          }
        }
      }
    }
    _shell = _shell.with(_shell.gatedFunc('use virt (remote)', shellLines))
  } else {
    for (const supportedManager of supportedManagers) {
      _shell = _shell
        .with(
          await _shell.fileLoad(
            [VIRT_KEY, supportedManager, op],
            import.meta.resolve,
            ['..'],
          ),
        )
        .with(
          await _shell.fileLoad(
            [VIRT_KEY, supportedManager],
            import.meta.resolve,
            ['..'],
          ),
        )
    }

    if (supportedManagers.includes('podman')) {
      const podmanConfig = await getCfgFileLoad([VIRT_KEY, 'podman'], { extension: Fmt.yaml })
      const networks = podmanConfig?.podman?.networks ?? {}
      _shell = _shell.with(_shell.varSetStr(VIRT_PODMAN_NETWORKS_KEY, JSON.stringify(networks)))
    }

    const applyResults = (results: Array<Array<string>>) => {
      const virtMap: Record<string, Array<string>> = {}
      for (const parts of results) {
        if (!parts[1] || (parts[0] === 'podman' && !parts[2])) {
          continue
        }
        ;(virtMap[parts[0]] ??= []).push(parts.slice(1).join('/'))
      }
      for (const key of Object.keys(virtMap)) {
        if (!supportedManagers.includes(key)) {
          continue
        }
        if (supportedManagers.length > 1) {
          _shell = _shell.with(
            _shell.varSetStr(VIRT_MANAGER_KEY, key),
          )
        }
        _shell = _shell
          .with(
            _shell.varSetArr(
              VIRT_INSTANCES_KEY,
              virtMap[key],
            ),
          )
          .with([getManagerFuncName(key)])
        if (supportedManagers.length > 1) {
          _shell = _shell.with(
            _shell.varUnSet(VIRT_MANAGER_KEY),
          )
        }
      }
    }

    if (op === 'list' || op === 'rem') {
      const managerFilters = filters.filter((f) => supportedManagers.some((m) => m.includes(f)))
      const instanceFilters = filters.filter((f) => !managerFilters.includes(f))
      const managersToOp = managerFilters.length > 0
        ? supportedManagers.filter((m) => managerFilters.some((f) => m.includes(f)))
        : supportedManagers
      for (const supportedManager of managersToOp) {
        if (supportedManagers.length > 1) {
          _shell = _shell.with(_shell.varSetStr(VIRT_MANAGER_KEY, supportedManager))
        }
        _shell = _shell
          .with(_shell.varSetArr(VIRT_INSTANCES_KEY, instanceFilters))
          .with([getManagerFuncName(supportedManager)])
        if (supportedManagers.length > 1) {
          _shell = _shell.with(_shell.varUnSet(VIRT_MANAGER_KEY))
        }
      }
    } else {
      applyResults(await getCfgDirDump(dirParts, { extension: Fmt.yaml, filters: filters.slice(0, 2) }))
    }
  }

  const body = _shell.build()

  if (environment.get(['log'])) {
    console.log(body)
  }

  return body
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

export class VirtCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.description = 'sync from remote'
    this.aliases = ['s', 'sy', 'up', 'update', 'upgrade']
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
