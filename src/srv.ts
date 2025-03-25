import pkg from '../package.json' with { type: 'json' }

import { type Cmd, CmdBase } from './lib/cmd'
import { PackCmd } from './lib/cmd/pack'
import { getSp } from './lib/ctx'

class SrvCmd extends CmdBase implements Cmd {
  constructor() {
    super()
    this.name = pkg.name.toLowerCase()
    this.desc = pkg.description.toLowerCase()
    this.scopes = [this.name]
    this.switches = [
      { keys: ['-d', '--debug'], desc: 'debug' },
      { keys: ['-g', '--grayscale'], desc: 'no color' },
      { keys: ['-n', '--noop'], desc: 'no op' },
      { keys: ['-s', '--succinct'], desc: 'omit info' },
      { keys: ['-t', '--trace'], desc: 'trace' },
      { keys: ['-v', '--verbose'], desc: 'add info' },
      { keys: ['-y', '--yes'], desc: 'yes' },
    ]
    this.commands = [new PackCmd(this.scopes)]
  }
}

async function runSrv(req: Request) {
  try {
    const cmd = new SrvCmd()
    const url = new URL(req.url)
    const usp = new URLSearchParams(url.search)
    const paths = url.pathname.split('/').filter(p => p.length > 0)

    if (!getSp(usp, 'sysSh')) {
      throw new Error('url param missing: sysSh')
    }

    return new Response(await cmd.process(url, usp, paths))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const fullMessage = `${message.trimEnd()}\n`

    return new Response(fullMessage, { status: 400 })
  }
}

const server = Bun.serve({
  hostname: process.env.hostname ?? '0.0.0.0',
  port: process.env.port ?? 9000,
  async fetch(_) {
    return new Response()
  },
})

server.reload({
  async fetch(req) {
    return await runSrv(req)
  },
})
