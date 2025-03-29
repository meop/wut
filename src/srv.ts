import pkg from '../package.json' with { type: 'json' }

import { type Cmd, CmdBase } from './lib/cmd'
import { PackCmd } from './lib/cmd/pack'
import { ScriptCmd } from './lib/cmd/script'
import { getCtx } from './lib/ctx'
import { Fmt, toConsole } from './lib/serde'
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
    this.commands = [new PackCmd(this.scopes), new ScriptCmd(this.scopes)]
  }
}

async function runSrv(req: Request) {
  try {
    const cmd = new SrvCmd()
    const url = new URL(req.url.endsWith('/') ? req.url.slice(0, -1) : req.url)
    const usp = new URLSearchParams(url.search)
    const parts = expandParts(url.pathname.split('/').filter(p => p.length > 0))

    const shell = (parts[0] === 'pwsh' ? new Pwsh() : new Zsh())
      .withVarSet('url'.toUpperCase(), url.toString())
      .withFsFileLoad('lib', 'print')
      .withFsFileLoad('vers')
      .withFsFileLoad('env')

    const context = getCtx(usp)

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
    const errObj: { [key: string]: string } = {}
    if (err instanceof Error) {
      if (err.stack) {
        errObj.stack = err.stack
      }
      errObj.message = err.message
    } else {
      errObj.object = String(err)
    }

    const json = toConsole(errObj, Fmt.json).trimEnd()
    console.error(json)

    const body = `${json
      .split('\n')
      // .map(l => `echo '${l.replaceAll("'", "'\\''")}'`)
      .map(l => `echo '${l.replaceAll("'", "'\\''")}'`) // zsh
      .join('\n')}\n`

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
