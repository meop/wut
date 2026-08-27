import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from './_test.ts'
import { runSrv } from './srv.ts'

// the /cfg route is how a running script pulls a file it needs verbatim — a Containerfile named by a podman Build
// doc, a pod yaml — so it serves bytes, not a generated script
Deno.test('cfg / serves a file the client fetches at runtime', async (t) => {
  const res = await runSrv(req('/cfg/virt/host/podman/web/Dockerfile.app'))
  const body = await res.text()
  await assertSnapshot(t, body)
  assertEquals(res.status, 200)
  assertEquals(body.startsWith('FROM docker.io/library/nginx'), true)
})

Deno.test('cfg / missing file says so rather than serving nothing', async (t) => {
  const res = await runSrv(req('/cfg/virt/host/podman/web/Dockerfile.nope'))
  const body = await res.text()
  await assertSnapshot(t, body)
  assertEquals(res.status, 404)
  assertEquals(body.includes('config not found: virt/host/podman/web/Dockerfile.nope'), true)
})

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
