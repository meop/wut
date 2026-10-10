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
// client side gates: the server cannot know what the client has, so they travel with the plan for it to answer.
// has_ needs one of its commands (or services) there, no_ needs none of them, which is how an install leaves the
// listing once its tool is in. a service is how a windows feature shows it is installed
const CLIENT_GATES = {
  cmds: 'has_cmd',
  noCmds: 'no_cmd',
  svcs: 'has_svc',
  noSvcs: 'no_svc',
} as const
type ClientGates = { -readonly [K in keyof typeof CLIENT_GATES]: Array<string> }

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
} & ClientGates

// slices tool -> action -> shell -> gate down to tool -> action -> gate for one shell,
// splitting the client side gates out of the server side sys_ gates
function shellGates(
  content: CtxFilter | null,
  shell: string,
): { filter: CtxFilter; client: Map<string, ClientGates> } {
  const filter: CtxFilter = {}
  const client = new Map<string, ClientGates>()
  for (const [tool, actions] of Object.entries(content ?? {})) {
    const toolActions: CtxFilter = {}
    for (const [action, shells] of Object.entries(actions as CtxFilter)) {
      const gate = (shells as CtxFilter)[shell] as CtxFilter | undefined
      if (!gate) {
        continue
      }
      const sysGates: CtxFilter = { ...gate }
      const gates = {} as ClientGates
      for (const [field, key] of Object.entries(CLIENT_GATES) as Array<[keyof ClientGates, string]>) {
        const names = sysGates[key]
        delete sysGates[key]
        gates[field] = Array.isArray(names) ? names as Array<string> : []
      }
      toolActions[action] = sysGates
      client.set([tool, action].join('/'), gates)
    }
    if (Object.keys(toolActions).length > 0) {
      filter[tool] = toolActions
    }
  }
  return { filter, client }
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
    const { filter: contextFilter, client } = shellGates(content, name)
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
        const gates = client.get(key) ?? { cmds: [], noCmds: [], svcs: [], noSvcs: [] }
        owned.set(key, { parts, extension, shell: name, ...gates })
      }
    }
  }
  return [...owned.values()].toSorted((a, b) => a.parts.join('/').localeCompare(b.parts.join('/')))
}

// the command that runs one matched script in the shell that owns it, with that shell's op preamble loaded in
async function buildScriptRun(
  shell: Sh,
  plat: string,
  match: ScriptMatch,
  args: Array<string>,
): Promise<string | null> {
  const fileContent = await getCfgFileContent(
    [...SCRIPT_DIR_PARTS, ...match.parts],
    { extension: match.extension },
  )
  if (fileContent == null) {
    return null
  }
  const targetShell = getScriptFlavorShell(match.shell)
  const scriptContent = [
    await getScriptFlavorOpPreamble(match.shell),
    args.length ? targetShell.varSetArr(WUT_ARGS_KEY, args) : '',
    fileContent,
  ].filter((part) => part.length).join('\n')
  return execScriptShell(shell, plat, match.shell, scriptContent)
}

// one tool's script for an action, resolved exactly as `script exec <action> <tool>` resolves it: owned by one
// shell, gated here by its sys_ keys, its has_cmd left for the client to ask when it runs
export async function resolveToolScript(
  shell: Sh,
  context: Ctx,
  action: string,
  tool: string,
): Promise<{ shell: string; cmds: Array<string>; run: string } | null> {
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })
  const filters = toDirFilters(action, [tool])
  const matches = await resolveMatches(context, content, filters)
  const [pinned] = pinpointMatch(matches.map((m) => m.parts), filters)
  const match = matches.find((m) => m.parts === pinned)
  if (!match) {
    return null
  }
  const run = await buildScriptRun(shell, context.sys_os_plat ?? '', match, [])
  return run == null ? null : { shell: match.shell, cmds: match.cmds, run }
}

function buildAndLog(shell: Sh, environment: Env) {
  const body = shell.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

type ScriptUnit = {
  id: string
  action: string
  tool: string
  shell: string
} & ClientGates

// a matched script as the client reads it. a named tool runs as asked, so it carries no gates: its own
// 'not installed' or 'already installed' explains a no op
function toUnit(match: ScriptMatch, named: boolean): ScriptUnit {
  return {
    id: match.parts.join('/'),
    action: match.parts[match.parts.length - 1],
    tool: match.parts.slice(0, -1).join('/'),
    shell: match.shell,
    cmds: named ? [] : match.cmds,
    noCmds: named ? [] : match.noCmds,
    svcs: named ? [] : match.svcs,
    noSvcs: named ? [] : match.noSvcs,
  }
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

  // data, not printed lines: whether a tool's gates are met is the client's to answer
  const units = matches.map((m) => toUnit(m, false)).filter((u) => u.tool)
  shell.with(await shell.fileLoad([SCRIPT_KEY], import.meta.resolve, ['..']))
  if (units.length) {
    shell.with(shell.varSetStr(SCRIPT_PLAN_KEY, JSON.stringify(units))).with(['scriptFindRun'])
  }
  return buildAndLog(shell, environment)
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

  let matches = await resolveMatches(context, content, filters)

  // a tool narrows to the one script to run, an action alone runs every script gated for this machine
  if (parts.length) {
    const [pinned] = pinpointMatch(matches.map((m) => m.parts), filters)
    matches = pinned ? matches.filter((m) => m.parts === pinned) : []
  }

  const units: Array<ScriptUnit> = []
  const arms: Array<string> = []
  for (const match of matches) {
    const run = await buildScriptRun(shell, context.sys_os_plat ?? '', match, args)
    if (run == null) {
      continue
    }
    const unit = toUnit(match, parts.length > 0)
    units.push(unit)
    arms.push(`    ${shell.toLiteral(unit.id)} => { ${run} }`)
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
