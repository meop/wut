import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { type CtxFilter, getCfgDirContent, getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
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
const SCRIPT_OP_PARTS_KEY = (op: string) => [SCRIPT_KEY, op, 'parts']
const SCRIPT_OP_ARGS_KEY = (op: string) => [SCRIPT_KEY, op, 'args']
// separate from SCRIPT_OP_ARGS_KEY (already auto-dumped as a flat string) to avoid a double-set
const WUT_ARGS_KEY = ['wut', 'args']
const SCRIPT_DIR_PARTS = [SCRIPT_KEY]

// nu is fastest and runs everywhere, pwsh next, zsh (unix-only) last
const SHELL_PRIORITY: Array<{ name: string; extension: string }> = [
  { name: 'nu', extension: 'nu' },
  { name: 'pwsh', extension: 'ps1' },
  { name: 'zsh', extension: 'zsh' },
]

// slices tool -> action -> shell -> gate down to tool -> action -> gate for one shell
function shellContextFilter(content: CtxFilter | null, shell: string): CtxFilter {
  const result: CtxFilter = {}
  for (const [tool, actions] of Object.entries(content ?? {})) {
    const toolActions: CtxFilter = {}
    for (const [action, shells] of Object.entries(actions as CtxFilter)) {
      const gate = (shells as CtxFilter)[shell]
      if (gate) {
        toolActions[action] = gate
      }
    }
    if (Object.keys(toolActions).length > 0) {
      result[tool] = toolActions
    }
  }
  return result
}

async function findOp(shell: Sh, context: Ctx, environment: Env) {
  const filters = environment.getSplit(SCRIPT_OP_PARTS_KEY('find'))
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })

  const grouped = new Map<string, Set<string>>()
  for (const { name, extension } of SHELL_PRIORITY) {
    const contextFilter = shellContextFilter(content, name)
    const results = await getCfgDirDump(SCRIPT_DIR_PARTS, {
      context,
      contextFilter,
      extension,
      filters,
      flexible: true,
    })
    for (const r of results) {
      const key = r[0]
      const val = r.slice(1).join('/')
      if (!grouped.has(key)) {
        grouped.set(key, new Set())
      }
      if (val) {
        grouped.get(key)!.add(val)
      }
    }
  }

  const shellLines: string[] = []
  for (
    const [key, scripts] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))
  ) {
    shellLines.push(...shell.print(key))
    if (scripts.size > 0) {
      shellLines.push(...shell.print(`  ${[...scripts].toSorted().join(', ')}`))
    }
  }

  const _shell = shell.with(shell.gatedFunc('use script', shellLines))
  const body = _shell.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

async function execOp(shell: Sh, context: Ctx, environment: Env) {
  const filters = environment.getSplit(SCRIPT_OP_PARTS_KEY('exec'))
  const args = environment.getSplit(SCRIPT_OP_ARGS_KEY('exec'))
  const content = await getCfgFileLoad([SCRIPT_KEY], { extension: Fmt.yaml })

  for (const { name, extension } of SHELL_PRIORITY) {
    const contextFilter = shellContextFilter(content, name)
    const matches = await getCfgDirDump(SCRIPT_DIR_PARTS, {
      context,
      contextFilter,
      extension,
      filters,
      pinpoint: true,
    })
    if (matches.length === 0) {
      continue
    }

    const redirect = await redirectShell(shell, name, context)
    if (redirect) {
      return redirect
    }

    let _shell = shell
    if (args.length) {
      _shell = _shell.with(_shell.varSetArr(WUT_ARGS_KEY, args))
    }
    _shell = _shell.with(
      await getCfgDirContent(SCRIPT_DIR_PARTS, { context, contextFilter, extension, filters, pinpoint: true }),
    )
    const body = _shell.build()
    if (environment.get(['log'])) {
      console.log(body)
    }
    return body
  }

  const body = shell.build()
  if (environment.get(['log'])) {
    console.log(body)
  }
  return body
}

export class ScriptCmdExec extends CmdBase implements Cmd {
  constructor(scopes: Array<string>) {
    super(scopes)
    this.name = 'exec'
    this.description = 'exec on local'
    this.aliases = ['e', 'execute', 'ru', 'run']
    this.arguments = [
      { name: 'parts', description: 'path part(s) to match', required: true },
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
    this.arguments = [{ name: 'parts', description: 'path part(s) to match' }]
  }
  override async work(
    shell: Sh,
    context: Ctx,
    environment: Env,
  ): Promise<string> {
    return await findOp(shell, context, environment)
  }
}
