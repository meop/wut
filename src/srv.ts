import type { Cli } from '@meop/shire/cli'
import { type Cmd } from '@meop/shire/cmd'
import { getCtx } from '@meop/shire/ctx'
import { SrvBase } from '@meop/shire/srv'
import { Fmt, stringify } from '@meop/shire/serde'

import { Nushell } from '@meop/shire/cli/nu'
import { Powershell } from '@meop/shire/cli/pwsh'
import { Zshell } from '@meop/shire/cli/zsh'

import { getCfgFsFileContent } from './cfg.ts'
import { FileCmd } from './cmd/file.ts'
import { PackCmd } from './cmd/pack.ts'
import { ScriptCmd } from './cmd/script.ts'
import { VirtCmd } from './cmd/virt.ts'

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
  cli = 'cli',
}

async function runSrv(request: Request) {
  try {
    const context = getCtx(request)
    const parts = context.req_path.split('/').filter((p) => p.length > 0)

    if (!parts.length) {
      return new Response(`echo "missing operation"`, {
        status: 400,
      })
    }

    const op = parts[0]
    if (op === Op.cfg) {
      const config = await getCfgFsFileContent(
        Promise.resolve(parts.slice(1)),
      )
      if (config == null) {
        return new Response(`echo "config not found: ${config}"`, {
          status: 404,
        })
      }
      return new Response(config)
    }

    if (!(parts.length > 1)) {
      return new Response(`echo "missing client"`, {
        status: 400,
      })
    }

    const cli = parts[1]
    if (!['pwsh', 'nu', 'zsh'].includes(cli)) {
      return new Response(`echo "unsupported client: ${cli}"`, {
        status: 404,
      })
    }

    let client: Cli = cli === 'pwsh'
      ? new Powershell()
      : cli === 'zsh'
      ? new Zshell()
      : new Nushell()

    client = client
      .with(
        client.varSet(
          Promise.resolve('REQ_URL_CFG'),
          Promise.resolve(
            client.toInner([context.req_orig, Op.cfg].join('/')),
          ),
        ),
      )
      .with(
        client.varSet(
          Promise.resolve('REQ_URL_CLI'),
          Promise.resolve(
            client.toInner(
              [context.req_orig, context.req_path, context.req_srch].join(''),
            ),
          ),
        ),
      )
      .with(client.fileLoad(Promise.resolve(['op'])))

    if (!context.sys_cpu_arch) {
      return new Response(
        await client
          .with(client.fileLoad(Promise.resolve(['ver'])))
          .with(client.fileLoad(Promise.resolve(['sys'])))
          .with(client.fileLoad(Promise.resolve(['get'])))
          .build(),
      )
    }

    for (const e of Object.entries(context)) {
      if (!e[1]) {
        continue
      }
      client = client.with(
        client.varSet(
          Promise.resolve(e[0].toUpperCase()),
          Promise.resolve(client.toInner(e[1])),
        ),
      )
    }

    try {
      const cmd = new SrvCmd()
      return new Response(await cmd.process(parts.slice(2), client, context))
    } catch (err) {
      let errStr = String(err)
      if (err instanceof Error) {
        errStr = stringify(getErr(err), Fmt.json)
      }
      console.error(errStr)
      const body = await client
        .with(client.printErr(Promise.resolve(errStr)))
        .build()
      return new Response(body)
    }
  } catch (err) {
    let errStr = String(err)
    if (err instanceof Error) {
      errStr = JSON.stringify(getErr(err), null, 2)
        .replaceAll('\\', '')
        .trimEnd()
    }
    console.error(errStr)
    const body = `echo "check server logs"`
    return new Response(body, { status: 500 })
  }
}

Deno.serve(
  {
    hostname: Deno.env.get('HOSTNAME') ?? '0.0.0.0',
    port: Number(Deno.env.get('PORT') ?? '9000'),
  },
  async (request) => await runSrv(request),
)
