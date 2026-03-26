import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { type CtxFilter, getCfgDirContent, getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
import { redirectNativeShell } from '../sh.ts'

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

async function execOp(shell: Sh, context: Ctx, environment: Env, op: string) {
  const redirect = await redirectNativeShell(shell, context)
  if (redirect) {
    return redirect
  }
  let _shell = shell

  const dirParts = [SCRIPT_KEY, _shell.name]
  const filters = environment.getSplit(SCRIPT_OP_PARTS_KEY(op))

  const content = await getCfgFileLoad([SCRIPT_KEY], {
    extension: Fmt.yaml,
  })

  let contextFilter: CtxFilter | undefined
  if (content != null) {
    contextFilter = content[_shell.name]
  }

  if (op === 'find') {
    const allResults = await getCfgDirDump(dirParts, {
      context,
      contextFilter,
      extension: _shell.extension,
      filters,
      flexible: true,
    })

    const grouped = new Map<string, string[]>()
    for (const r of allResults) {
      const key = r[0]
      const val = r.slice(1).join('/')
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      if (val) {
        grouped.get(key)!.push(val)
      }
    }

    const shellLines: string[] = []
    for (
      const [key, scripts] of [...grouped.entries()].toSorted(([a], [b]) => a.localeCompare(b))
    ) {
      shellLines.push(..._shell.print(key))
      if (scripts.length > 0) {
        shellLines.push(..._shell.print(`  ${scripts.toSorted().join(', ')}`))
      }
    }

    _shell = _shell.with(
      _shell.gatedFunc(
        'use script (remote)',
        shellLines,
      ),
    )
  } else {
    _shell = _shell.with(
      await getCfgDirContent(dirParts, {
        context,
        contextFilter,
        extension: _shell.extension,
        filters,
      }),
    )
  }

  const body = _shell.build()

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
    return await execOp(shell, context, environment, this.name)
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
    return await execOp(shell, context, environment, this.name)
  }
}
