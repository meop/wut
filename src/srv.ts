import pkg from '../package.json' with { type: 'json' }

import { getCfgFsFileLoad } from './lib/cfg'
import { type Cmd, CmdBase } from './lib/cmd'
import { PackCmd } from './lib/cmd/pack'
import { ScriptCmd } from './lib/cmd/script'
import { VirtCmd } from './lib/cmd/virt'
import { getCtx } from './lib/ctx'
import { Fmt, toCon } from './lib/serde'
import type { Sh } from './lib/sh'
import { Nushell } from './lib/sh/nu'
import { Powershell } from './lib/sh/pwsh'
import { Zshell } from './lib/sh/zsh'

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
  constructor(sh: string) {
    super([])
    this.name = pkg.name.toLowerCase()
    this.desc = pkg.description.toLowerCase()
    const fmtKeys = Object.keys(Fmt).map((k, i) => {
      if (i === 0) {
        return k
      }
      return `[${k}]`
    })

    this.options = [
      {
        keys: ['-f', '--format'],
        desc: `print format <${fmtKeys.join(', ')}>`,
      },
    ]
    this.switches = [
      { keys: ['-d', '--debug'], desc: 'print debug' },
      { keys: ['-g', '--grayscale'], desc: 'print no color' },
      { keys: ['-l', '--log'], desc: 'log on server' },
      { keys: ['-n', '--noop'], desc: 'print but no op' },
      { keys: ['-s', '--succinct'], desc: 'no print' },
      { keys: ['-t', '--trace'], desc: 'print trace' },
      { keys: ['-y', '--yes'], desc: 'no prompt' },
    ]
    this.commands.push(new PackCmd([this.name]))
    if (sh === 'pwsh' || sh === 'zsh') {
      this.commands.push(new ScriptCmd([this.name]))
    }
    if (sh === 'nu') {
      this.commands.push(new VirtCmd([this.name]))
    }
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

async function runSrv(req: Request) {
  try {
    const context = getCtx(req)

    let ext: string | undefined
    let path = context.req.path
    const extIndex = path.lastIndexOf('.')
    if (extIndex !== -1) {
      ext = path.substring(extIndex + 1)
      path = path.substring(0, extIndex)
    }

    const parts = expandParts(path.split('/').filter(p => p.length > 0))

    if (!parts.length) {
      return new Response(`echo "missing op"`, {
        status: 400,
      })
    }

    const op = parts[0]
    if (op === Op.cfg) {
      const config = await getCfgFsFileLoad(async () => parts.slice(1), ext)
      if (!config.length) {
        return new Response(`echo "config not found: ${config}"`, {
          status: 404,
        })
      }
      return new Response(config)
    }

    if (!(parts.length > 1)) {
      return new Response(`echo "missing shell"`, {
        status: 400,
      })
    }

    const sh = parts[1]
    if (!['pwsh', 'nu', 'zsh'].includes(sh)) {
      return new Response(`echo "unsupported shell: ${sh}"`, {
        status: 404,
      })
    }

    const shell: Sh = (
      sh === 'pwsh'
        ? new Powershell()
        : sh === 'nu'
          ? new Nushell()
          : new Zshell()
    )
      .withVarSet(
        async () => 'REQ_URL_CFG',
        async () => [context.req.orig, Op.cfg].join('/'),
      )
      .withVarSet(
        async () => 'REQ_URL_SH',
        async () =>
          [context.req.orig, context.req.path, context.req.srch].join(''),
      )
      .withFsFileLoad(async () => ['sh', 'op'])
      .withFsFileLoad(async () => ['sh', 'ver'])
      .withFsFileLoad(async () => ['sh', 'sys'])

    if (!context.sys?.cpu?.arch) {
      return new Response(
        await shell.withFsFileLoad(async () => ['sh', 'get']).build(),
      )
    }

    try {
      const cmd = new SrvCmd(sh)
      return new Response(await cmd.process(parts.slice(2), shell, context))
    } catch (err) {
      let errStr = String(err)
      if (err instanceof Error) {
        errStr = toCon(getErr(err), Fmt.json)
      }
      console.error(errStr)
      const body = await shell.withPrintErr(async () => [errStr]).build()
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

const server = Bun.serve({
  hostname: process.env.hostname ?? '0.0.0.0',
  port: process.env.port ?? 9000,
  async fetch(req) {
    return await runSrv(req)
  },
})

server.reload({
  async fetch(req) {
    return await runSrv(req)
  },
})
