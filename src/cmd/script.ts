import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { type CtxFilter, getCfgDirDump, getCfgFileContent, getCfgFileLoad, pinpointMatch } from '../cfg.ts'
import { execScriptShell, getScriptFlavorOpPreamble, getScriptFlavorShell, redirectCommonShell } from '../sh.ts'

export class ScriptCmd extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'script'
    this.description = 'shell script ops'
    this.aliases = ['s', 'sc', 'scr']
    this.commands = [
      new ScriptCmdExec([...this.scopes, this.name]),
      new ScriptCmdFind([...this.scopes, this.name]),
    ]
  }
}

const SCRIPT_KEY = 'script'
const SCRIPT_OP_ACTION_KEY = (op: string) => [SCRIPT_KEY, op, 'action']
const SCRIPT_OP_PARTS_KEY = (op: string) => [SCRIPT_KEY, op, 'parts']
const SCRIPT_OP_ARGS_KEY = (op: string) => [SCRIPT_KEY, op, 'args']
// separate from SCRIPT_OP_ARGS_KEY (already auto-dumped as a flat string) to avoid a double-set
const WUT_ARGS_KEY = ['wut', 'args']
const SCRIPT_DIR_PARTS = [SCRIPT_KEY]
// the units the client picks from, as data; their bodies live in scriptRunUnit
const SCRIPT_PLAN_KEY = [SCRIPT_KEY, 'plan']
// a client side gate: the server cannot know what is on the client's path, so it compiles into the emitted script
const HAS_CMD_KEY = 'has_cmd'

// ties go to the most native shell, so a hop lands somewhere as close to the machine as the script allows
const SHELL_PRIORITY: Array<{ name: string; extension: string }> = [
  { name: 'zsh', extension: 'zsh' },
  { name: 'pwsh', extension: 'ps1' },
  { name: 'nu', extension: 'nu' },
]

type ScriptMatch = {
  parts: Array<string>
  extension: string
  shell: string
  cmds: Array<string>
}

// slices tool -> action -> shell -> gate down to tool -> action -> gate for one shell,
// splitting the client side has_cmd gate out of the server side sys_ gates
function shellGates(
  content: CtxFilter | null,
  shell: string,
): { filter: CtxFilter; cmds: Map<string, Array<string>> } {
  const filter: CtxFilter = {}
  const cmds = new Map<string, Array<string>>()
  for (const [tool, actions] of Object.entries(content ?? {})) {
    const toolActions: CtxFilter = {}
    for (const [action, shells] of Object.entries(actions as CtxFilter)) {
      const gate = (shells as CtxFilter)[shell] as CtxFilter | undefined
      if (!gate) {
        continue
      }
      const { [HAS_CMD_KEY]: hasCmd, ...sysGates } = gate
      toolActions[action] = sysGates
      if (Array.isArray(hasCmd) && hasCmd.length > 0) {
        cmds.set([tool, action].join('/'), hasCmd)
      }
    }
    if (Object.keys(toolActions).length > 0) {
      filter[tool] = toolActions
    }
  }
  return { filter, cmds }
}

// the cli reads action first (setup ptyxis), the config tree is tool first (ptyxis/setup)
function toDirFilters(action: string, parts: Array<string>): Array<string> {
  return action ? [...parts, action] : parts
}

// every script is owned by one shell, in SHELL_PRIORITY order, so an overlay never runs twice
async function resolveMatches(
  context: Ctx,
  content: CtxFilter | null,
  filters: Array<string>,
): Promise<Array<ScriptMatch>> {
  const owned = new Map<string, ScriptMatch>()
  for (const { name, extension } of SHELL_PRIORITY) {
    const { filter: contextFilter, cmds } = shellGates(content, name)
    const results = await getCfgDirDump(SCRIPT_DIR_PARTS, {
      context,
      contextFilter,
      extension,
      filters,
      flexible: true,
    })
    for (const parts of results) {
      const key = parts.join('/')
      if (!owned.has(key)) {
        owned.set(key, { parts, extension, shell: name, cmds: cmds.get(key) ?? [] })
      }
    }
  }
  return [...owned.values()].toSorted((a, b) => a.parts.join('/').localeCompare(b.parts.join('/')))
}

function buildAndLog(shell: Sh, environment: Env) {
  const body = shell.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

async function findOp(shell: Sh, context: Ctx, environment: Env) {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  const action = environment.get(SCRIPT_OP_ACTION_KEY('find')) ?? ''
  const parts = environment.getSplit(SCRIPT_OP_PARTS_KEY('find'))
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })
  const matches = await resolveMatches(context, content, toDirFilters(action, parts))

  const grouped = new Map<string, Set<string>>()
  for (const match of matches) {
    const key = match.parts[match.parts.length - 1]
    const tool = match.parts.slice(0, -1).join('/')
    if (!grouped.has(key)) {
      grouped.set(key, new Set())
    }
    if (tool) {
      grouped.get(key)!.add(match.cmds.length ? `${tool}=${match.cmds.join(',')}` : tool)
    }
  }

  // data, not printed lines: whether a tool's has_cmd gate is satisfied is the client's to answer
  const shellLines: string[] = []
  for (
    const [key, entries] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))
  ) {
    shellLines.push(
      ['scriptFindAdd', key, ...[...entries].toSorted()]
        .map((part, i) => i === 0 ? part : shell.toLiteral(part))
        .join(' '),
    )
  }
  if (shellLines.length) {
    shellLines.push('scriptFindShow')
  }

  return buildAndLog(
    shell
      .with(await shell.fileLoad([SCRIPT_KEY], import.meta.resolve, ['..']))
      .with(shellLines),
    environment,
  )
}

async function execOp(shell: Sh, context: Ctx, environment: Env) {
  const redirect = await redirectCommonShell(shell, context)
  if (redirect) {
    return redirect
  }

  const action = environment.get(SCRIPT_OP_ACTION_KEY('exec')) ?? ''
  const parts = environment.getSplit(SCRIPT_OP_PARTS_KEY('exec'))
  const args = environment.getSplit(SCRIPT_OP_ARGS_KEY('exec'))
  const filters = toDirFilters(action, parts)
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })
  const plat = context.sys_os_plat ?? ''

  let matches = await resolveMatches(context, content, filters)

  // a tool narrows to the one script to run, an action alone runs every script gated for this machine
  if (parts.length) {
    const [pinned] = pinpointMatch(matches.map((m) => m.parts), filters)
    matches = pinned ? matches.filter((m) => m.parts === pinned) : []
  }

  if (!matches.length) {
    return buildAndLog(
      shell.with(shell.printWarn(`no script matched: ${[action, ...parts].join(' ')}`)),
      environment,
    )
  }

  const units: Array<{ id: string; action: string; tool: string; shell: string; cmds: Array<string> }> = []
  const arms: Array<string> = []
  for (const match of matches) {
    const fileContent = await getCfgFileContent(
      [...SCRIPT_DIR_PARTS, ...match.parts],
      { extension: match.extension },
    )
    if (fileContent == null) {
      continue
    }
    const id = match.parts.join('/')
    const targetShell = getScriptFlavorShell(match.shell)
    const scriptContent = [
      await getScriptFlavorOpPreamble(match.shell),
      args.length ? targetShell.varSetArr(WUT_ARGS_KEY, args) : '',
      fileContent,
    ].filter((part) => part.length).join('\n')
    units.push({
      id,
      action: match.parts[match.parts.length - 1],
      tool: match.parts.slice(0, -1).join('/'),
      shell: match.shell,
      // a named tool runs as asked, so its own 'not installed' warning still explains a no op
      cmds: parts.length ? [] : match.cmds,
    })
    arms.push(
      `    ${shell.toLiteral(id)} => { ${execScriptShell(shell, plat, match.shell, scriptContent)} }`,
    )
  }

  if (!units.length) {
    return buildAndLog(
      shell.with(shell.printWarn(`no script matched: ${[action, ...parts].join(' ')}`)),
      environment,
    )
  }

  return buildAndLog(
    shell
      .with(await shell.fileLoad(['sel'], import.meta.resolve, ['..']))
      .with(await shell.fileLoad([SCRIPT_KEY], import.meta.resolve, ['..']))
      .with([
        'def --env scriptRunUnit [id: string] {',
        '  match $id {',
        ...arms,
        '    _ => {}',
        '  }',
        '}',
      ])
      .with(shell.varSetStr(SCRIPT_PLAN_KEY, JSON.stringify(units)))
      .with(['scriptPlanRun']),
    environment,
  )
}

export class ScriptCmdExec extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'exec'
    this.description = 'exec on local'
    this.aliases = ['e', 'execute', 'ru', 'run']
    this.arguments = [
      { name: 'action', description: 'action to match', required: true },
      { name: 'parts', description: 'tool path part(s) to match' },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await execOp(shell, context, environment)
  }
}

export class ScriptCmdFind extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'find'
    this.description = 'find on web'
    this.aliases = ['f', 'fi', 'se', 'search']
    this.arguments = [
      { name: 'action', description: 'action to match' },
      { name: 'parts', description: 'tool path part(s) to match' },
    ]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await findOp(shell, context, environment)
  }
}
