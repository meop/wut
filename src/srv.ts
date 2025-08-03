import pkg from '../package.json' with { type: 'json' }

import { getCfgFsFileContent } from './cfg.ts'
import { Nushell } from './cli/nu.ts'
import { Powershell } from './cli/pwsh.ts'
import { Zshell } from './cli/zsh.ts'
import type { Cli } from './cli.ts'
import { FileCmd } from './cmd/file.ts'
import { PackCmd } from './cmd/pack.ts'
import { ScriptCmd } from './cmd/script.ts'
import { VirtCmd } from './cmd/virt.ts'
import { type Cmd, CmdBase } from './cmd.ts'
import { getCtx } from './ctx.ts'
import { Fmt, toCon } from './serde.ts'

function expandParts(parts: Array<string>) {
  const expandedParts: Array<string> = []

  for (const part of parts) {
    if (part.startsWith('-') && !part.startsWith('--')) {
      for (const c of part.split('').slice(1)) {
        expandedParts.push(`-${c}`)
      }
      continue
    }
    expandedParts.push(part)
  }

  return expandedParts
}

class SrvCmd extends CmdBase implements Cmd {
  constructor() {
    super([])
    this.name = pkg.name.toLowerCase()
    this.description = pkg.description.toLowerCase()
    const fmtKeys = Object.keys(Fmt).map((k, i) => {
      if (i === 0) {
        return k
      }
      return `[${k}]`
    })
    this.options.push({
      keys: ['-f', '--format'],
      description: `print format <${fmtKeys.join(', ')}>`,
    })
    this.switches.push(
      { keys: ['-d', '--debug'], description: 'print debug' },
      { keys: ['-g', '--grayscale'], description: 'print no color' },
      { keys: ['-l', '--log'], description: 'log on server' },
      { keys: ['-n', '--noop'], description: 'print but no op' },
      { keys: ['-s', '--succinct'], description: 'no print' },
      { keys: ['-t', '--trace'], description: 'print trace' },
      { keys: ['-y', '--yes'], description: 'no prompt' },
    )
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

async function runSrv(req: Request) {
  try {
    const context = getCtx(req)
    const path = context.req_path
    const parts = expandParts(path.split('/').filter(p => p.length > 0))

    if (!parts.length) {
      return new Response(`echo "missing operation"`, {
        status: 400,
      })
    }

    const op = parts[0]
    if (op === Op.cfg) {
      const config = await getCfgFsFileContent(Promise.resolve(parts.slice(1)))
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

    let client: Cli =
      cli === 'pwsh'
        ? new Powershell()
        : cli === 'zsh'
          ? new Zshell()
          : new Nushell()

    client = client
      .with(
        client.varSet(
          Promise.resolve('REQ_URL_CFG'),
          Promise.resolve(client.toInner([context.req_orig, Op.cfg].join('/'))),
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
      .with(client.fsFileLoad(Promise.resolve(['op'])))

    if (!context.sys_cpu_arch) {
      return new Response(
        await client
          .with(client.fsFileLoad(Promise.resolve(['ver'])))
          .with(client.fsFileLoad(Promise.resolve(['sys'])))
          .with(client.fsFileLoad(Promise.resolve(['get'])))
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
        errStr = toCon(getErr(err), Fmt.json)
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
    hostname: Deno.env.get('hostname') ?? '0.0.0.0',
    port: Number(Deno.env.get('port') ?? '9000'),
  },
  async req => await runSrv(req),
)
