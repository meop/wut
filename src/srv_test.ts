import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from './_test.ts'
import { runSrv } from './srv.ts'

// /cfg serves bytes verbatim — a podman Build doc's Containerfile is fetched through it
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

// an argument is one path segment, so a name with a slash of its own travels percent encoded and is decoded after the
// split. a pack yaml spells such names as they are, and a typed one reaches a group through them
Deno.test('pack / a name with a slash stays one name, typed or in a group', async () => {
  const plan = async (path: string) => {
    const body = await (await runSrv(req(`/sh/nu/pack/add/${path}?sysOsPlat=linux&sysOs=arch&wutNuPinned=1`))).text()
    return body.split('\n').filter((l) => l.startsWith('$env.PACK_')).join('\n')
  }
  const grouped = await plan('slashed')
  assertEquals(grouped.includes('"@scope/pkg"'), true)
  assertEquals(grouped.includes('"golang.org/x/tools/gopls"'), true)
  assertEquals((await plan('golang.org%2Fx%2Ftools%2Fgopls')).includes('test-slashed'), true)
  const loose = await plan('github.com%2Fowner%2Ftool')
  assertEquals(loose.includes('github.com/owner/tool'), true)
  assertEquals(loose.includes("'github.com'"), false)
})
