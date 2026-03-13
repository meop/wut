import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirDump } from '../cfg.ts'
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
  linux: ['lxc', 'podman', 'qemu'],
  darwin: [],
  winnt: [],
}

const VIRT_KEY = 'virt'
const VIRT_MANAGER_KEY = [VIRT_KEY, 'manager']
const VIRT_OP_KEY = [VIRT_KEY, 'op']
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
  if (!manager) {
    return ''
  }
  const first = manager[0].toUpperCase()
  const rest = manager
    .slice(1)
    .replaceAll('-', '')
    .replaceAll('_', '')
    .toLowerCase()

  return `${prefix}${first}${rest}`
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
    const allResults = await getCfgDirDump(dirParts, { extension: Fmt.yaml, flexible: true })
    const grouped = new Map<string, string[]>()
    for (const r of allResults) {
      if (!supportedManagers.includes(r[0])) continue
      const key = r.slice(0, 2).join(' ')
      if (r.length > 2) {
        const existing = grouped.get(key)
        if (existing) existing.push(r[2])
        else grouped.set(key, [r[2]])
      } else if (!grouped.has(key)) {
        grouped.set(key, [])
      }
    }
    const shellLines: string[] = []
    for (const [key, containers] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))) {
      if (filters.length > 0) {
        const keyMatch = filters.some((f) => key.includes(f))
        const matchedContainers = containers.filter((c) => keyMatch || filters.some((f) => c.includes(f)))
        if (!keyMatch && matchedContainers.length === 0) continue
        shellLines.push(..._shell.print(key))
        const display = keyMatch ? containers : matchedContainers
        if (display.length > 0) shellLines.push(..._shell.print(`  ${display.toSorted().join(', ')}`))
      } else {
        shellLines.push(..._shell.print(key))
        if (containers.length > 0) shellLines.push(..._shell.print(`  ${containers.toSorted().join(', ')}`))
      }
    }
    _shell = _shell.with(_shell.gatedFunc('use virt (remote)', shellLines))
  } else {
    for (const supportedManager of supportedManagers) {
      _shell = _shell.with(
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
    const results = await getCfgDirDump(dirParts, {
      extension: Fmt.yaml,
      filters,
    })

    const virtMap: Record<string, Array<string>> = {}

    for (const parts of results) {
      if (!parts[1]) continue
      if (parts[0] in virtMap) {
        virtMap[parts[0]].push(parts.slice(1).join('/'))
      } else {
        virtMap[parts[0]] = [parts.slice(1).join('/')]
      }
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
      _shell = _shell.with(
        _shell.varSetArr(
          VIRT_INSTANCES_KEY,
          virtMap[key],
        ),
      ).with([getManagerFuncName(key)])
      if (supportedManagers.length > 1) {
        _shell = _shell.with(
          _shell.varUnSet(VIRT_MANAGER_KEY),
        )
      }
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
