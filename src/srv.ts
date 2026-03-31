import { type Cmd, resolveCanonicalParts } from '@meop/shire/cmd'
import { type Ctx, getCtx } from '@meop/shire/ctx'
import { Fmt, stringify } from '@meop/shire/serde'
import type { Sh } from '@meop/shire/sh'
import { NuSh } from '@meop/shire/sh/nu'
import { PowerSh } from '@meop/shire/sh/pwsh'
import { ZSh } from '@meop/shire/sh/zsh'
import { SrvBase } from '@meop/shire/srv'

import { getCfgFileContent } from './cfg.ts'
import { settings } from './settings.ts'
import { FileCmd } from './cmd/file.ts'
import { PackCmd } from './cmd/pack.ts'
import { ScriptCmd } from './cmd/script.ts'
import { VirtCmd } from './cmd/virt.ts'
import { VERSIONS } from './vers.ts'

class SrvCmd extends SrvBase implements Cmd {
  constructor() {
    super([])
    this.name = 'wut'
    this.description = 'web update tool'
    this.commands.push(
      new FileCmd([this.name]),
      new PackCmd([this.name]),
      new ScriptCmd([this.name]),
      new VirtCmd([this.name]),
    )
  }
}

function getErr(err: Error) {
  return {
    error: {
      message: err.message,
      stack: err.stack,
    },
  }
}

enum Op {
  cfg = 'cfg',
  sh = 'sh',
}

const SH_VERS_MAJOR_KEY = ['sh', 'vers', 'major']
const SH_VERS_MINOR_KEY = ['sh', 'vers', 'minor']

const VAR_REQ_URL_OP_KEY = (op: string) => ['req', 'url', op]

export async function runSrv(request: Request) {
  try {
    const context = getCtx(request)
    const parts = context.req_path.split('/').filter((p) => p.length > 0)

    if (!parts.length) {
      return new Response(`echo "operation request missing"`, {
        status: 400,
      })
    }

    const op = parts[0]
    if (op === Op.cfg) {
      const config = await getCfgFileContent(parts.slice(1))
      if (config == null) {
        return new Response(`echo "config not found: ${config}"`, {
          status: 404,
        })
      }
      return new Response(config)
    } else if (op != Op.sh) {
      return new Response(`echo "operation requested not supported: ${op}`)
    }

    if (!(parts.length > 1)) {
      return new Response(`echo "shell request missing"`, {
        status: 400,
      })
    }

    const sh = parts[1]
    const shellCtors: Record<string, () => Sh> = {
      nu: () => new NuSh(),
      pwsh: () => new PowerSh(),
      zsh: () => new ZSh(),
    }
    if (!(sh in shellCtors)) {
      return new Response(`echo "shell requested not supported: ${sh}"`, {
        status: 404,
      })
    }

    let shell = shellCtors[sh]()

    shell = shell
      .with(
        shell.varSetStr(
          VAR_REQ_URL_OP_KEY(Op.cfg),
          [context.req_orig, Op.cfg].join('/'),
        ),
      )
      .with(
        shell.varSetStr(
          VAR_REQ_URL_OP_KEY(Op.sh),
          [context.req_orig, context.req_path, context.req_srch].join(''),
        ),
      )
      .with(await shell.fileLoad(['op']))

    const vers = VERSIONS[sh]
    shell = shell
      .with(shell.varSet(SH_VERS_MAJOR_KEY, String(vers.major)))
      .with(shell.varSet(SH_VERS_MINOR_KEY, String(vers.minor)))
    shell = shell.with(await shell.fileLoad(['vers']))

    if (
      !(Object.keys(context).filter((k) => k.startsWith('sys')).some((k) => context[k as keyof Ctx]))
    ) {
      return new Response(
        shell
          .with(await shell.fileLoad(['sys']))
          .with(await shell.fileLoad(['get']))
          .build(),
      )
    }

    const cmd = new SrvCmd()
    const canonicalParts = resolveCanonicalParts(cmd, parts.slice(2))
    const canonicalContext: Ctx = { ...context, req_path: ['', 'sh', sh, ...canonicalParts].join('/') }

    for (const e of Object.entries(canonicalContext)) {
      if (!e[1]) {
        continue
      }
      shell = shell.with(
        shell.varSetStr([e[0]], e[1]),
      )
    }

    try {
      return new Response(await cmd.process(parts.slice(2), shell, canonicalContext))
    } catch (err) {
      let error = String(err)
      if (err instanceof Error) {
        error = stringify(getErr(err), Fmt.json)
      }
      console.error(error)
      const body = shell.with(shell.printErr(error)).build()
      return new Response(body)
    }
  } catch (err) {
    let error = String(err)
    if (err instanceof Error) {
      error = JSON.stringify(getErr(err), null, 2)
        .replaceAll('\\', '')
        .trimEnd()
    }
    console.error(error)
    const body = `echo "check server logs"`
    return new Response(body, { status: 500 })
  }
}

if (import.meta.main) {
  Deno.serve(
    {
      hostname: Deno.env.get('HOSTNAME') ?? '0.0.0.0',
      port: settings.port ?? Number(Deno.env.get('PORT') ?? '80'),
    },
    async (request) => await runSrv(request),
  )
}
