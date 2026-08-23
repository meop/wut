import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { type CtxFilter, getCfgDirDump, getCfgFileContent, getCfgFileLoad, pinpointMatch } from '../cfg.ts'
import { redirectShell } from '../sh.ts'

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
// a client side gate: the server cannot know what is on the client's path, so it compiles into the emitted script
const HAS_CMD_KEY = 'has_cmd'
// set on a fan out hop, so the target shell runs only what it owns and never hops onward itself
const SHELL_ONLY_PARAM = 'wutShellOnly'
// the caller already showed the whole plan and asked, so a hop must not ask again
const AGREED_PARAM = 'wutAgreed'
// the shell the run started in, carried across a hop so the target resolves ownership the same way its caller did
const SHELL_FROM_PARAM = 'wutShellFrom'

// ties go to the most native shell, so a hop lands somewhere as close to the machine as the script allows
const SHELL_PRIORITY: Array<{ name: string; extension: string }> = [
  { name: 'zsh', extension: 'zsh' },
  { name: 'pwsh', extension: 'ps1' },
  { name: 'nu', extension: 'nu' },
]

// the calling shell runs its scripts inline, so it wins ties outright — a hop it never has to make is the cheapest one
function shellOrder(from: string): Array<{ name: string; extension: string }> {
  return [
    ...SHELL_PRIORITY.filter((s) => s.name === from),
    ...SHELL_PRIORITY.filter((s) => s.name !== from),
  ]
}

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

// everything below runs only if the plan was agreed to, hops included
function agreeLines(shell: Sh): Array<string> {
  return shell.name === 'zsh'
    ? ['if ! scriptPlanShow; then', '  return', 'fi']
    : shell.name === 'pwsh'
    ? ['if (-not (scriptPlanShow)) {', '  return', '}']
    : ['if not (scriptPlanShow) {', '  return', '}']
}

// the client side gate, wrapped around a block the client may not be able to run
function hasCmdLines(shell: Sh, cmds: Array<string>, lines: Array<string>): Array<string> {
  const call = ['scriptHasCmd', ...cmds.map((cmd) => shell.toLiteral(cmd))].join(' ')
  return shell.name === 'zsh' ? [`if ${call}; then`, ...lines, 'fi'] : [`if (${call}) {`, ...lines, '}']
}

// the cli reads action first (setup ptyxis), the config tree is tool first (ptyxis/setup)
function toDirFilters(action: string, parts: Array<string>): Array<string> {
  return action ? [...parts, action] : parts
}

function getParam(context: Ctx, key: string): string {
  return new URLSearchParams(context.req_srch).get(key) ?? ''
}

// every script is owned by one shell, so an overlay never runs twice — and both sides of a hop must agree on which,
// which is why ownership resolves against the shell the run started in, not the shell rendering this response
async function resolveMatches(
  context: Ctx,
  content: CtxFilter | null,
  filters: Array<string>,
  from: string,
): Promise<Array<ScriptMatch>> {
  const owned = new Map<string, ScriptMatch>()
  for (const { name, extension } of shellOrder(from)) {
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
  const action = environment.get(SCRIPT_OP_ACTION_KEY('find')) ?? ''
  const parts = environment.getSplit(SCRIPT_OP_PARTS_KEY('find'))
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })
  const matches = await resolveMatches(context, content, toDirFilters(action, parts), shell.name)

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

  const shellLines: string[] = []
  for (
    const [key, entries] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))
  ) {
    if (entries.size === 0) {
      shellLines.push(...shell.print(key))
      continue
    }
    shellLines.push(
      ['scriptFindGroup', key, ...[...entries].toSorted()]
        .map((part, i) => i === 0 ? part : shell.toLiteral(part))
        .join(' '),
    )
  }

  return buildAndLog(
    shell
      .with(await shell.fileLoad([SCRIPT_KEY], import.meta.resolve, ['..']))
      .with(shell.gatedFunc('use script', shellLines)),
    environment,
  )
}

async function execOp(shell: Sh, context: Ctx, environment: Env) {
  const action = environment.get(SCRIPT_OP_ACTION_KEY('exec')) ?? ''
  const parts = environment.getSplit(SCRIPT_OP_PARTS_KEY('exec'))
  const args = environment.getSplit(SCRIPT_OP_ARGS_KEY('exec'))
  const filters = toDirFilters(action, parts)
  const shellOnly = getParam(context, SHELL_ONLY_PARAM)
  const shellFrom = getParam(context, SHELL_FROM_PARAM) || shell.name
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })

  let matches = await resolveMatches(context, content, filters, shellFrom)

  // a tool narrows to the one script to run, an action alone runs every script gated for this machine
  if (parts.length) {
    const [pinned] = pinpointMatch(matches.map((m) => m.parts), filters)
    matches = pinned ? matches.filter((m) => m.parts === pinned) : []

    const match = matches[0]
    if (match && match.shell !== shell.name) {
      const redirect = await redirectShell(shell, match.shell, context)
      if (redirect) {
        return redirect
      }
    }
  }

  if (shellOnly) {
    matches = matches.filter((m) => m.shell === shellOnly)
  }

  // a named tool runs as asked, so its own 'not installed' warning still explains a no op
  const gated = !parts.length

  if (!matches.length) {
    return buildAndLog(
      shell.with(shell.printWarn(`no script matched: ${[action, ...parts].join(' ')}`)),
      environment,
    )
  }

  const agreed = !!getParam(context, AGREED_PARAM)

  let _shell = shell
  if (matches.length && args.length) {
    _shell = _shell.with(_shell.varSetArr(WUT_ARGS_KEY, args))
  }
  _shell = _shell.with(await shell.fileLoad([SCRIPT_KEY], import.meta.resolve, ['..']))

  // the shell that was asked shows the whole plan, hops included: has_cmd is answerable here for all of them
  if (!agreed) {
    for (const match of matches) {
      const action = match.parts[match.parts.length - 1]
      const tool = match.parts.slice(0, -1).join('/')
      _shell = _shell.with([
        ['scriptPlanAdd', action, tool, match.shell, ...match.cmds]
          .map((p) => _shell.toLiteral(p))
          .join(' ')
          .replace(/^\S+/, 'scriptPlanAdd'),
      ])
    }
  }
  if (!agreed) {
    _shell = _shell.with(agreeLines(shell))
  }

  for (const { name } of shellOrder(shellFrom)) {
    const shellMatches = matches.filter((m) => m.shell === name)
    if (!shellMatches.length) {
      continue
    }
    if (name === shell.name) {
      for (const match of shellMatches) {
        const fileContent = await getCfgFileContent(
          [...SCRIPT_DIR_PARTS, ...match.parts],
          { extension: match.extension },
        )
        if (fileContent == null) {
          continue
        }
        _shell = _shell.with(
          gated && match.cmds.length ? hasCmdLines(shell, match.cmds, [fileContent]) : fileContent,
        )
      }
      continue
    }
    if (shellOnly) {
      continue
    }
    const redirect = await redirectShell(shell, name, context, [
      `${SHELL_ONLY_PARAM}=${name}`,
      `${SHELL_FROM_PARAM}=${shellFrom}`,
      `${AGREED_PARAM}=1`,
    ])
    if (redirect) {
      _shell = _shell.with(redirect)
    }
  }

  return buildAndLog(_shell, environment)
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
