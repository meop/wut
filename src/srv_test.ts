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
// split. a pack yaml spells such names as they are, and a typed one is handed to the managers whole
Deno.test('pack / a name with a slash stays one name, typed or in a group', async () => {
  const plan = async (path: string) => {
    const body = await (await runSrv(req(`/sh/nu/pack/add/${path}?sysOsPlat=linux&sysOs=arch&wutNuPinned=1`))).text()
    return body.split('\n').filter((l) => l.startsWith('$env.PACK_')).join('\n')
  }
  const grouped = await plan('slashed')
  assertEquals(grouped.includes('"@scope/pkg"'), true)
  assertEquals(grouped.includes('"golang.org/x/tools/gopls"'), true)
  // a package a group holds is not a name for the group, so typing one is a loose name like any other
  const held = await plan('golang.org%2Fx%2Ftools%2Fgopls')
  assertEquals(held.includes('test-slashed'), false)
  assertEquals(held.includes("r#'golang.org/x/tools/gopls'#"), true)
  const loose = await plan('github.com%2Fowner%2Ftool')
  assertEquals(loose.includes('github.com/owner/tool'), true)
  assertEquals(loose.includes("'github.com'"), false)
})

// the runtime checks and syncs the pinned nu before the command runs, so -v has to be in the environment by then, in
// the bootstrap every shell starts from and in the pinned nu's own body
Deno.test('-v / is set before the nu runtime runs, and only when asked', async () => {
  const runtime: Record<string, RegExp> = {
    nu: /^wutNuSync$/,
    pwsh: /^ {2}wutNuInstall \$wutHome /,
    zsh: /^ {2}nu_sync$/,
  }
  const verbose = /^(\$env\.VERBOSE = |\$env:VERBOSE = |export VERBOSE=)/
  for (
    const [sh, query] of [
      ['nu', ''],
      ['pwsh', ''],
      ['zsh', ''],
      ['nu', '?sysOsPlat=linux&wutNuPinned=1'],
    ]
  ) {
    const lines = (await (await runSrv(req(`/sh/${sh}/-v/pack/list${query}`))).text()).split('\n')
    const set = lines.findIndex((l) => verbose.test(l))
    const run = lines.findIndex((l) => runtime[sh].test(l))
    assertEquals(run > -1, true, `${sh}${query}: no runtime`)
    assertEquals(set > -1 && set < run, true, `${sh}${query}: VERBOSE at ${set}, runtime at ${run}`)

    const quiet = (await (await runSrv(req(`/sh/${sh}/pack/list${query}`))).text()).split('\n')
    assertEquals(quiet.some((l) => verbose.test(l)), false, `${sh}${query}: VERBOSE without -v`)
  }
})

