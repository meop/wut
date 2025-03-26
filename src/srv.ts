import pkg from '../package.json' with { type: 'json' }

import { type Cmd, CmdBase } from './lib/cmd'
import { PackCmd } from './lib/cmd/pack'
import { getSp } from './lib/ctx'
import { Fmt } from './lib/seri'

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
    super()
    this.name = pkg.name.toLowerCase()
    this.desc = pkg.description.toLowerCase()
    this.scopes = [this.name]
    this.options = [
      {
        keys: ['-f', '--format'],
        desc: `print format: ${Object.keys(Fmt).join(', ')}`,
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
    this.commands = [new PackCmd(this.scopes)]
  }
}

async function runSrv(req: Request) {
  try {
    const cmd = new SrvCmd()
    const url = new URL(req.url)
    const usp = new URLSearchParams(url.search)
    const parts = expandParts(url.pathname.split('/').filter(p => p.length > 0))

    if (!getSp(usp, 'sysSh')) {
      throw new Error('url param missing: sysSh')
    }

    return new Response(await cmd.process(url, usp, parts))
  } catch (err) {
    const lines: Array<string> = []
    lines.push('error:')
    if (err instanceof Error) {
      if (err.stack) {
        lines.push('stack:')
        lines.push(err.stack)
      }
      lines.push('message:')
      lines.push(err.message)
    } else {
      lines.push(String(err))
    }

    const body = `${lines.join('\n').trimEnd()}\n`
    console.error(body)

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
