import type { BunRequest } from 'bun'
import { getArch, getPlat, getSh } from './lib/os'
import { buildProg } from './prog'

const shExt = {
  pwsh: 'ps1',
  zsh: 'zsh',
}

const shVarPrefix = {
  pwsh: '$',
  zsh: '',
}

async function repeatSearch(urlStr: string, sh: string) {
  const lines: Array<string> = []
  const extension = shExt[sh]
  const prefix = shVarPrefix[sh]

  lines.push(
    `${prefix}urlStr='${urlStr}'`,
    '',
    await Bun.file(`${import.meta.dir}/snip/${sh}/os.${extension}`).text(),
    await Bun.file(`${import.meta.dir}/snip/${sh}/web.${extension}`).text(),
  )

  return lines.join('\n')
}

function getSearchParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.has(key)
    ? (searchParams.get(key) ?? '')
    : undefined

  return value
}

async function runSrv(req: BunRequest<'/:sh'>) {
  try {
    const url = new URL(req.url)
    const urlSearchParams = new URLSearchParams(url.search)

    let sh = req.params.sh
    sh = getSh(sh)

    let arch = getSearchParam(urlSearchParams, 'arch')
    let plat = getSearchParam(urlSearchParams, 'plat')
    let dist = getSearchParam(urlSearchParams, 'dist')

    if (!arch || !plat) {
      return new Response(await repeatSearch(req.url, sh))
    }

    arch = getArch(arch)
    plat = getPlat(plat)
    dist = dist ? dist.toLowerCase() : undefined

    const prog = await buildProg()

    const help = prog.helpInformation()
    const helpLines = help
      .split('\n')
      .map(l => `echo '${l}'`)
      .join('\n')

    return new Response(helpLines)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const fullMessage = message.endsWith('\n') ? message : `${message}\n`

    return new Response(fullMessage, { status: 400 })
  }
}

const server = Bun.serve({
  hostname: process.env.hostname ?? '0.0.0.0',
  port: process.env.port ?? 9000,
  fetch(_) {
    return new Response()
  },
})

server.reload({
  routes: {
    '/:sh': async req => await runSrv(req),
  },
})
