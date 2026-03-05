import { type Cmd, CmdBase } from '@meop/shire/cmd'
import type { Ctx, CtxFilter } from '@meop/shire/ctx'
import { type Env } from '@meop/shire/env'
import { Fmt } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'

import { getCfgDirContent, getCfgDirDump, getCfgFileLoad } from '../cfg.ts'
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
  if (redirect) return redirect
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
    _shell = _shell.with(
      _shell.gatedFunc(
        'use config (remote)',
        _shell.print(
          await getCfgDirDump(dirParts, {
            context,
            contextFilter,
            extension: _shell.extension,
            filters,
            flexible: true,
          }).then((x) => x.map((y) => y.join(' ')).toSorted()),
        ),
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
