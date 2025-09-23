import process from 'node:process'

import type { Cli } from '@meop/shire/cli'
import { Nushell } from '@meop/shire/cli/nu'
import { Powershell } from '@meop/shire/cli/pwsh'
import { Zshell } from '@meop/shire/cli/zsh'
import { type Cmd } from '@meop/shire/cmd'
import { type Ctx, getCtx } from '@meop/shire/ctx'
import { joinKey } from '@meop/shire/reg'
import { Fmt, stringify } from '@meop/shire/serde'
import { SrvBase } from '@meop/shire/srv'

import { getCfgFileContent } from './cfg.ts'
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

const CLI_VER_MAJOR_KEY = ['cli', 'ver', 'major']
const CLI_VER_MINOR_KEY = ['cli', 'ver', 'minor']

const VAR_CLI_VER_MAJOR_KEY = (cli: string) => [cli, 'ver', 'major']
const VAR_CLI_VER_MINOR_KEY = (cli: string) => [cli, 'ver', 'minor']
const VAR_REQ_URL_OP_KEY = (op: string) => ['req', 'url', op]

async function runSrv(request: Request) {
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
    } else if (op != Op.cli) {
      return new Response(`echo "operation requested not supported: ${op}`)
    }

    if (!(parts.length > 1)) {
      return new Response(`echo "client request missing"`, {
        status: 400,
      })
    }

    const cli = parts[1]
    if (!['nu', 'pwsh', 'zsh'].includes(cli)) {
      return new Response(`echo "client requested not supported: ${cli}"`, {
        status: 404,
      })
    }

    let client: Cli = cli === 'nu'
      ? new Nushell()
      : cli === 'pwsh'
      ? new Powershell()
      : new Zshell()

    client = client
      .with(
        client.varSet(
          VAR_REQ_URL_OP_KEY(Op.cfg),
          client.toInner([context.req_orig, Op.cfg].join('/')),
        ),
      )
      .with(
        client.varSet(
          VAR_REQ_URL_OP_KEY(Op.cli),
          client.toInner(
            [context.req_orig, context.req_path, context.req_srch].join(''),
          ),
        ),
      )
      .with(await client.fileLoad(['op']))

    const major = process.env[joinKey(...VAR_CLI_VER_MAJOR_KEY(cli))]
    if (major) {
      client = client.with(client.varSet(CLI_VER_MAJOR_KEY, major))
    }
    const minor = process.env[joinKey(...VAR_CLI_VER_MINOR_KEY(cli))]
    if (minor) {
      client = client.with(client.varSet(CLI_VER_MINOR_KEY, minor))
    }
    client = client.with(await client.fileLoad(['ver']))

    if (
      !(Object.keys(context).filter((k) => k.startsWith('sys')).some((k) =>
        context[k as keyof Ctx]
      ))
    ) {
      return new Response(
        client
          .with(await client.fileLoad(['sys']))
          .with(await client.fileLoad(['get']))
          .build(),
      )
    }

    for (const e of Object.entries(context)) {
      if (!e[1]) {
        continue
      }
      client = client.with(
        client.varSet([e[0]], client.toInner(e[1])),
      )
    }

    try {
      const cmd = new SrvCmd()
      return new Response(await cmd.process(parts.slice(2), client, context))
    } catch (err) {
      let error = String(err)
      if (err instanceof Error) {
        error = stringify(getErr(err), Fmt.json)
      }
      console.error(error)
      const body = client.with(client.printErr(error)).build()
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

Deno.serve(
  {
    hostname: process.env['HOSTNAME'] ?? '0.0.0.0',
    port: Number(process.env['PORT'] ?? '9000'),
  },
  async (request) => await runSrv(request),
)
