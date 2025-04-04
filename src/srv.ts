import pkg from '../package.json' with { type: 'json' }

import { buildCfgFilePath, loadCfgFileContents } from './lib/cfg'
import { type Cmd, CmdBase } from './lib/cmd'
import { PackCmd } from './lib/cmd/pack'
import { ScriptCmd } from './lib/cmd/script'
import { VirtCmd } from './lib/cmd/virt'
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
    this.commands = [
      new PackCmd([this.name]),
      new ScriptCmd([this.name]),
      new VirtCmd([this.name]),
    ]
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
    const cmd = new SrvCmd()

    const parts = expandParts(
      context.req.path.split('/').filter(p => p.length > 0),
    )

    if (!parts.length) {
      return new Response(`echo "client error; missing op"`, {
        status: 400,
      })
    }

    const op = parts[0]
    if (op === Op.cfg) {
      const config = buildCfgFilePath(...parts.slice(1))
      if (!(await Bun.file(config).exists())) {
        return new Response(
          `echo "client error; config not found: ${config}"`,
          {
            status: 404,
          },
        )
      }
      return new Response(await Bun.file(config).text())
    }

    if (!(parts.length > 1)) {
      return new Response(`echo "client error; missing shell"`, {
        status: 400,
      })
    }

    const sh = parts[1]
    if (sh !== 'zsh' && sh !== 'pwsh') {
      return new Response(`echo "client error; unsupported shell: ${sh}"`, {
        status: 404,
      })
    }

    let shell: Sh = (sh === 'pwsh' ? new Pwsh() : new Zsh())
      .withVarSet(
        async () => 'req_url_cfg',
        async () => [context.req.orig, Op.cfg].join('/'),
      )
      .withVarSet(
        async () => 'req_url_sh',
        async () =>
          [context.req.orig, context.req.path, context.req.srch].join(''),
      )
      .withFsFileLoad(async () => ['print'])
      .withFsFileLoad(async () => ['ver'])

    if (!context.sys?.cpu?.arch) {
      shell = shell.withFsFileLoad(async () => ['env'])
      return new Response(
        await shell.withFsFileLoad(async () => ['sh']).build(),
      )
    }

    if (context.sys?.cpu?.arch) {
      shell = shell.withVarSet(
        async () => 'sys_cpu_arch',
        async () => context.sys?.cpu?.arch ?? '',
      )
    }
    if (context.sys?.os?.plat) {
      shell = shell.withVarSet(
        async () => 'sys_os_plat',
        async () => context.sys?.os?.plat ?? '',
      )
    }
    if (context.sys?.os?.dist) {
      shell = shell.withVarSet(
        async () => 'sys_os_dist',
        async () => context.sys?.os?.dist ?? '',
      )
    }
    if (context.sys?.os?.ver?.id) {
      shell = shell.withVarSet(
        async () => 'sys_os_ver_id',
        async () => context.sys?.os?.ver?.id ?? '',
      )
    }
    if (context.sys?.os?.ver?.code) {
      shell = shell.withVarSet(
        async () => 'sys_os_ver_code',
        async () => context.sys?.os?.ver?.code ?? '',
      )
    }
    if (context.sys?.host) {
      shell = shell.withVarSet(
        async () => 'sys_host',
        async () => context.sys?.host ?? '',
      )
    }
    if (context.sys?.user) {
      shell = shell.withVarSet(
        async () => 'sys_user',
        async () => context.sys?.user ?? '',
      )
    }

    try {
      return new Response(
        await cmd.process(
          parts.slice(2),
          shell.withFsFileLoad(async () => ['dyn']),
          context,
        ),
      )
    } catch (err) {
      let errStr = String(err)
      if (err instanceof Error) {
        errStr = toCon(getErr(err), Fmt.json).trimEnd()
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
