import pkg from '../package.json' with { type: 'json' }

import { type Cmd, CmdBase } from './lib/cmd'
import { PackCmd } from './lib/cmd/pack'
import { ScriptCmd } from './lib/cmd/script'
import { getCtx } from './lib/ctx'
import { Fmt, toCon } from './lib/serde'
import type { Sh } from './lib/sh'
import { Pwsh } from './lib/sh/pwsh'
import { Zsh } from './lib/sh/zsh'

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
    this.desc = pkg.description.toLowerCase()
    const fmtKeys = Object.keys(Fmt)
      .map((k, i) => {
        if (i === 0) {
          return k
        }
        return `[${k}]`
      })
      .reverse()

    this.options = [
      {
        keys: ['-f', '--format'],
        desc: `print format <${fmtKeys.join(', ')}>`,
      },
    ]
    this.switches = [
      { keys: ['-d', '--debug'], desc: 'print debug' },
      { keys: ['-g', '--grayscale'], desc: 'print no color' },
      { keys: ['-n', '--noop'], desc: 'print but no op' },
      { keys: ['-s', '--succinct'], desc: 'no print' },
      { keys: ['-t', '--trace'], desc: 'print trace' },
      { keys: ['-v', '--verbose'], desc: 'print extra' },
      { keys: ['-y', '--yes'], desc: 'no prompt' },
    ]
    this.commands = [new PackCmd([this.name]), new ScriptCmd([this.name])]
  }
}

async function runSrv(req: Request) {
  try {
    const cmd = new SrvCmd()
    const url = new URL(req.url.endsWith('/') ? req.url.slice(0, -1) : req.url)
    const usp = new URLSearchParams(url.search)
    const parts = expandParts(url.pathname.split('/').filter(p => p.length > 0))
    const sh = parts[0]

    if (sh !== 'zsh' && sh !== 'pwsh') {
      return new Response(`echo "unsupported shell: ${sh}"`, { status: 404 })
    }

    const context = getCtx(usp)
    let shell: Sh = sh === 'pwsh' ? new Pwsh() : new Zsh()

    try {
      shell = shell
        .withVarSet('url'.toUpperCase(), url.toString())
        .withFsFileLoad('ver')
        .withFsFileLoad('env')
        .withFsFileLoad('lib', 'print')

      if (!context.sys?.cpu?.arch) {
        return new Response(await shell.withFsFileLoad('cli').build())
      }

      return new Response(
        await cmd.process(
          url,
          usp,
          parts.slice(1),
          shell.withFsFileLoad('lib', 'dyn'),
          context,
        ),
      )
    } catch (err) {
      const errObj: {
        error: {
          message?: string
          stack?: string
        }
      } = { error: {} }
      if (err instanceof Error) {
        errObj.error.message = err.message
        if (err.stack) {
          errObj.error.stack = err.stack
        }
      } else {
        errObj.error.message = String(err)
      }

      const body = await shell
        .withPrintErr(toCon(errObj, Fmt.json).trimEnd())
        .build()
      console.error(body)

      return new Response(body, { status: 200 })
    }
  } catch (err) {
    const body = `echo "unexpected error: ${err.message.replaceAll('\\', '')}"`
    return new Response(body, { status: 400 })
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
