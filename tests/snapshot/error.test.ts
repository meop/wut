import { assertSnapshot } from '@std/testing/snapshot'

import { runSrv } from '../../src/srv.ts'
import { checkSyntax, req } from '../helpers.ts'

Deno.test('error / unsupported operation', async (t) => {
  const body = await (await runSrv(req('/invalid/nu/file/sync'))).text()
  await assertSnapshot(t, body)
  // This usually returns a simple echo, which is valid in most shells
  await checkSyntax('nu', body)
})

Deno.test('error / unsupported shell', async (t) => {
  const body = await (await runSrv(req('/sh/invalid/file/sync'))).text()
  await assertSnapshot(t, body)
  // Defaults to a simple echo
  await checkSyntax('nu', body)
})

Deno.test('error / operation request missing', async (t) => {
  const body = await (await runSrv(req('/'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

Deno.test('error / shell request missing', async (t) => {
  const body = await (await runSrv(req('/sh'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

Deno.test('error / command not found (nu)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/invalid'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

Deno.test('error / command not found (pwsh)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/file/invalid'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('error / command not found (zsh)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/file/invalid'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
