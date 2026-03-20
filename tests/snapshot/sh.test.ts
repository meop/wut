import { assertSnapshot } from '@std/testing/snapshot'

import { runSrv } from '../../src/srv.ts'
import { checkSyntax, req } from '../helpers.ts'

// pwsh → nu redirect
Deno.test('pwsh / file / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/file/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / file / sync (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/file/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / pack / add (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/pack/add/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / pack / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/pack/find/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / virt / list (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/virt/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

// zsh → nu redirect
Deno.test('zsh / file / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/file/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / file / sync (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/file/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / pack / add (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/pack/add/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / pack / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/pack/find/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / virt / list (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/virt/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
