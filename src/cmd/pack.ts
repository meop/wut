import type { Cli } from '@meop/shire/cli'
import { Powershell } from '@meop/shire/cli/pwsh'
import { Zshell } from '@meop/shire/cli/zsh'
import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'

import { getCfgDirDump, getCfgFileLoad } from '../cfg.ts'

export class PackCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'pack'
    this.description = 'package manager ops'
    this.aliases = ['p', 'pa', 'pac', 'package']
    this.options = [
      { keys: ['-m', '--manager'], description: 'manager to use' },
    ]
    this.commands = [
      new PackCmdAdd([...this.scopes, this.name]),
      new PackCmdFind([...this.scopes, this.name]),
      new PackCmdList([...this.scopes, this.name]),
      new PackCmdOut([...this.scopes, this.name]),
      new PackCmdRem([...this.scopes, this.name]),
      new PackCmdSync([...this.scopes, this.name]),
      new PackCmdTidy([...this.scopes, this.name]),
    ]
  }
}

const osPlatToManagers: { [key: string]: Array<string> } = {
  linux: ['yay', 'pacman', 'apt', 'dnf', 'zypper'],
  darwin: ['brew'],
  winnt: ['choco', 'scoop', 'winget'],
}

const osIdToManagers: { [key: string]: Array<string> } = {
  arch: ['yay', 'pacman'],
  archarm: ['yay', 'pacman'],
  manjaro: ['yay', 'pacman'],
  debian: ['apt'],
  linuxmint: ['apt'],
  ubuntu: ['apt'],
  fedora: ['dnf'],
  centos: ['dnf'],
  'centos-stream': ['dnf'],
  rocky: ['dnf'],
  rhel: ['dnf'],
  opensuse: ['zypper'],
  'opensuse-tumbleweed': ['zypper'],
  suse: ['zypper'],
}

const PACK_KEY = 'pack'
const PACK_MANAGER_KEY = [PACK_KEY, 'manager']
const PACK_OP_KEY = [PACK_KEY, 'op']
const PACK_OP_NAMES_KEY = (op: string) => [PACK_KEY, op, 'names']
const PACK_OP_GROUP_KEY = (op: string) => [PACK_KEY, op, 'group']
const PACK_OP_GROUP_NAMES_KEY = (
  op: string,
) => [PACK_KEY, op, 'group', 'names']

function getSupportedManagers(context: Ctx, environment: Env) {
  let managers: Array<string> = []

  const osPlat = context.sys_os_plat
  const osId = context.sys_os_id

  if (osPlat) {
    managers.push(...osPlatToManagers[osPlat])
  }
  if (osId) {
    managers = managers.filter((p) => osIdToManagers[osId].includes(p))
  }
  if (environment.get(PACK_MANAGER_KEY)) {
    managers = managers.filter((p) => p === environment.get(PACK_MANAGER_KEY))
  }

  return managers
}

function getManagerFuncName(manager: string, prefix = PACK_KEY) {
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

async function loadManagerFiles(
  client: Cli,
  supportedManagers: Array<string>,
  op: string,
) {
  let _client = client
  for (const supportedManager of supportedManagers) {
    _client = _client
      .with(
        await _client.fileLoad(
          [PACK_KEY, supportedManager, op],
          import.meta.resolve,
          ['..'],
        ),
      )
      .with(
        await _client.fileLoad(
          [PACK_KEY, supportedManager],
          import.meta.resolve,
          ['..'],
        ),
      )
  }
  return _client
}

function buildAndLog(client: Cli, environment: Env) {
  const body = client.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

async function initOp(
  client: Cli,
  context: Ctx,
  environment: Env,
  op: string,
): Promise<{ client: Cli; managers: Array<string> }> {
  let _client = client.with(client.varSet(PACK_OP_KEY, client.toLiteral(op)))
  const managers = getSupportedManagers(context, environment)
  _client = await loadManagerFiles(_client, managers, op)
  return { client: _client, managers }
}

async function loadGroupConfig(name: string) {
  return await getCfgFileLoad([PACK_KEY, name], { extension: Fmt.yaml })
}

async function findGroups(filters?: Array<string>) {
  const results = await getCfgDirDump([PACK_KEY], {
    extension: Fmt.yaml,
    filters,
    flexible: true,
  })
  return results.map((r) => r.join(' '))
}

function printGroups(client: Cli, matches: Array<string>) {
  return client.with(
    client.gatedFunc('use config (remote)', client.print(matches.toSorted())),
  )
}

function callManagers(client: Cli, managers: Array<string>) {
  return client.with(managers.map((m) => getManagerFuncName(m)))
}

function setOpNames(client: Cli, op: string, names: string) {
  return client.with(
    client.varSet(PACK_OP_NAMES_KEY(op), client.toLiteral(names)),
  )
}

function setOpGroupNames(
  client: Cli,
  context: Ctx,
  op: string,
  values: Array<string>,
) {
  return client.with(
    client.varSetArr(
      PACK_OP_GROUP_NAMES_KEY(op),
      values.map((v: string) =>
        client.name === 'nu'
          ? client.toElement(
            context.sys_os_plat === 'winnt'
              ? Powershell.execStr(client.toLiteral(v))
              : Zshell.execStr(client.toLiteral(v)),
          )
          : client.toLiteral(v)
      ),
    ),
  )
}

function unsetOpGroupNames(client: Cli, op: string) {
  return client.with(client.varUnSet(PACK_OP_GROUP_NAMES_KEY(op)))
}

function setManager(client: Cli, manager: string) {
  return client.with(
    client.varSet(PACK_MANAGER_KEY, client.toLiteral(manager)),
  )
}

function unsetManager(client: Cli) {
  return client.with(client.varUnSet(PACK_MANAGER_KEY))
}

interface ManagerEntry {
  names: Array<string>
  [op: string]: Array<string> | undefined
}

function processManagerEntry(
  client: Cli,
  context: Ctx,
  op: string,
  manager: string,
  entry: ManagerEntry,
  multiManager: boolean,
): Cli {
  let _client = client

  if (multiManager) {
    _client = setManager(_client, manager)
  }

  if (entry[op]) {
    _client = setOpGroupNames(_client, context, op, entry[op] as Array<string>)
  }

  _client = setOpNames(_client, op, entry.names.join(' '))
  _client = _client.with([getManagerFuncName(manager)])

  if (entry[op]) {
    _client = unsetOpGroupNames(_client, op)
  }

  if (multiManager) {
    _client = unsetManager(_client)
  }

  return _client
}

async function processGroupConfig(
  client: Cli,
  context: Ctx,
  op: string,
  managers: Array<string>,
  name: string,
): Promise<{ client: Cli; found: boolean }> {
  const content = await loadGroupConfig(name)
  if (content == null) {
    return { client, found: false }
  }

  let _client = client
  const multiManager = managers.length > 1

  for (const key of Object.keys(content)) {
    if (!managers.includes(key)) {
      continue
    }
    const entry = content[key] as ManagerEntry
    if (!entry?.names?.length) {
      continue
    }
    _client = processManagerEntry(
      _client,
      context,
      op,
      key,
      entry,
      multiManager,
    )
  }

  return { client: _client, found: true }
}

async function processGroupNames(
  client: Cli,
  context: Ctx,
  op: string,
  managers: Array<string>,
  names: Array<string>,
): Promise<{ client: Cli; found: Array<string> }> {
  let _client = client
  const found: Array<string> = []

  for (const name of names) {
    const result = await processGroupConfig(
      _client,
      context,
      op,
      managers,
      name,
    )
    _client = result.client
    if (result.found) {
      found.push(name)
    }
  }

  return { client: _client, found }
}

async function processGroupFind(
  client: Cli,
  names: Array<string>,
): Promise<{ client: Cli; found: Array<string> }> {
  const found: Array<string> = []

  for (const name of names) {
    const matches = await findGroups([name])
    if (matches.length) {
      found.push(name)
    }
  }

  return { client, found }
}

async function execOp(
  client: Cli,
  context: Ctx,
  environment: Env,
  op: string,
): Promise<string> {
  const { client: _client, managers } = await initOp(
    client,
    context,
    environment,
    op,
  )
  let result = _client

  if (op === 'tidy') {
    return buildAndLog(callManagers(result, managers), environment)
  }

  const names = environment.getSplit(PACK_OP_NAMES_KEY(op))
  let found: Array<string> = []

  if (environment.get(PACK_OP_GROUP_KEY(op))) {
    if (op === 'find') {
      const groupResult = await processGroupFind(result, names)
      found = groupResult.found
      result = printGroups(result, names.length ? found : await findGroups())
    } else {
      const groupResult = await processGroupNames(
        result,
        context,
        op,
        managers,
        names,
      )
      result = groupResult.client
      found = groupResult.found
    }
  }

  const remaining = names.filter((n) => !found.includes(n))

  if (op === 'find' || op === 'list' || op === 'out') {
    for (const name of remaining) {
      result = setOpNames(result, op, name)
      result = callManagers(result, managers)
    }
    if (names.length === 0) {
      result = callManagers(result, managers)
    }
  } else {
    if (remaining.length) {
      result = setOpNames(result, op, remaining.join(' '))
    }
    if (remaining.length || names.length === 0) {
      result = callManagers(result, managers)
    }
  }

  return buildAndLog(result, environment)
}

export class PackCmdAdd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'add'
    this.description = 'add on local'
    this.aliases = ['a', 'ad', 'in', 'install']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', required: true },
    ]
    this.switches = [{
      keys: ['-g', '--group'],
      description: 'group search will be used',
    }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}

export class PackCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find from remote'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
    this.switches = [{
      keys: ['-g', '--group'],
      description: 'group search will be used',
    }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}

export class PackCmdList extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'list'
    this.description = 'list on local'
    this.aliases = ['l', 'li', 'ls']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}

export class PackCmdOut extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'out'
    this.description = 'list out of sync on local'
    this.aliases = ['o', 'ou']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}

export class PackCmdRem extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'rem'
    this.description = 'remove on local'
    this.aliases = ['r', 'rm', 'rem', 'remove', 'un', 'unin', 'uninstall']
    this.arguments = [
      { name: 'names', description: 'name(s) to match', required: true },
    ]
    this.switches = [{
      keys: ['-g', '--group'],
      description: 'group search will be used',
    }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}

export class PackCmdSync extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'sync'
    this.description = 'sync from remote'
    this.aliases = ['s', 'sy', 'up', 'update', 'upgrade']
    this.arguments = [{ name: 'names', description: 'name(s) to match' }]
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}

export class PackCmdTidy extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'tidy'
    this.description = 'tidy on local'
    this.aliases = ['t', 'ti', 'cl', 'clean']
  }
  override async work(
    client: Cli,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(client, context, environment, this.name)
  }
}
