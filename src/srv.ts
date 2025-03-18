import type { BunRequest } from 'bun'

import { getCpuArch, getOsPlat, getSysSh } from './lib/os'

import type { Sh } from './lib/cmd/sh'
import { Pwsh } from './lib/cmd/sh/pwsh'
import { Zsh } from './lib/cmd/sh/zsh'

function getSh(sysSh: string) {
  let sh: Sh
  if (sysSh === 'pwsh') {
    sh = new Pwsh()
  } else {
    sh = new Zsh()
  }
  return sh
}

async function reHydrate(url: string, sysSh: string) {
  return await getSh(sysSh)
    .withSetVar('WUT_URL', url, { singleQ: true })
    .withLoadFilePath('sys', 'env')
    .withLoadFilePath('cli')
    .build()
}

function getSearchParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.has(key)
    ? (searchParams.get(key) ?? '')
    : undefined

  return value
}

async function runSrv(req: BunRequest<'/*' | '/'>) {
  try {
    const url = new URL(req.url)
    const urlSearchParams = new URLSearchParams(url.search)

    const spSysCpuArch = getSearchParam(urlSearchParams, 'sysCpuArch')
    const spSysOsPlat = getSearchParam(urlSearchParams, 'sysOsPlat')
    const spSysOsDist = getSearchParam(urlSearchParams, 'sysOsDist')
    const spSysOsVer = getSearchParam(urlSearchParams, 'sysOsVer')
    const spSysSh = getSearchParam(urlSearchParams, 'sysSh')

    const sysSh = spSysSh ? getSysSh(spSysSh) : ''

    if (!spSysCpuArch || !spSysOsPlat) {
      return new Response(await reHydrate(url.toString(), sysSh))
    }

    const sysCpuArch = getCpuArch(spSysCpuArch)
    const sysOsPlat = getOsPlat(spSysOsPlat)
    const sysOsDist = spSysOsDist ? spSysOsDist.toLowerCase() : undefined
    const sysOsVer = spSysOsVer ? spSysOsVer.toLowerCase() : undefined

    return new Response(
      await getSh(sysSh)
        .withLoadFilePath('sys', 'log')
        .withLogInfo(`sysCpuArch=${sysCpuArch}`)
        .withLogInfo(`sysOsPlat=${sysOsPlat}`)
        .withLogInfo(`sysOsDist=${sysOsDist}`)
        .withLogInfo(`sysOsVer=${sysOsVer}`)
        .withLogInfo(`sysSh=${sysSh}`)
        .build(),
    )
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
    // console.log('root fetch')
    return new Response()
  },
})

server.reload({
  routes: {
    '/*': async req => {
      // console.log('wild route')
      return await runSrv(req)
    },
    '/': async req => {
      // console.log('root route')
      return await runSrv(req)
    },
  },
})
