import { assertSnapshot } from '@std/testing/snapshot'

import { runSrv } from '../../src/srv.ts'
import { checkSyntax, req } from '../helpers.ts'

// nu × alpine (apk)
Deno.test('nu / alpine / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × arch (pacman + paru + yay)
Deno.test('nu / arch / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × rocky (dnf)
Deno.test('nu / rocky / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × ubuntu (apt)
Deno.test('nu / ubuntu / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × void (xbps)
Deno.test('nu / void / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × suse (zypper)
Deno.test('nu / suse / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin (brew)
Deno.test('nu / darwin / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt (choco + scoop + winget)
Deno.test('nu / winnt / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt × find (no names — exercises PACK_FIND_NAMES='')
Deno.test('nu / winnt / find (no names)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin × find (no names)
Deno.test('nu / darwin / find (no names)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × no-sys (bootstrap path)
Deno.test('nu / no-sys / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
