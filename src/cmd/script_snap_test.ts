import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu builds the (nu ∪ zsh ∪ pwsh) overlay listing directly — find never redirects
Deno.test('nu / linux / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// pwsh × winnt
Deno.test('pwsh / winnt / find', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
// zsh × darwin
Deno.test('zsh / darwin / find', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// zsh × linux
Deno.test('zsh / linux / find', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / linux / find (install filter)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/find/install?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// exec tests
Deno.test('nu / linux / exec (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/install?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / exec (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/install?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('pwsh / winnt / exec', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/install?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('zsh / darwin / exec (no match, docker not gated for darwin)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/docker/setup?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
// docker exists under both pwsh and zsh, both gated to linux — pwsh wins priority even though zsh called
Deno.test('zsh / linux / exec (overlay redirects to pwsh)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/docker/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// overlay: cargo exists under nu, zsh, and pwsh — nu wins priority regardless of which shell called
Deno.test('nu / linux / exec (overlay, already nu)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/cargo/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('zsh / linux / exec (overlay redirects to nu)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/cargo/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('pwsh / winnt / exec (overlay redirects to nu)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/cargo/setup?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

// overlay dedup: cargo's setup script exists under both nu and zsh on linux, find shows it once
Deno.test('zsh / linux / find (overlay dedup)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/find/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// reachability: cfg/script/orphan/setup.nu exists on disk but has no script.yaml entry, so it must not surface
Deno.test('nu / linux / find (undeclared script excluded)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=linux'))).text()
  assertEquals(body.includes('orphan'), false)
})
Deno.test('nu / linux / exec (undeclared script not runnable)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/exec/orphan/setup?sysOsPlat=linux'))).text()
  assertEquals(body.includes('this script is intentionally undeclared'), false)
})

// "--" separates match tokens from trailing script args, injected as $WUT_ARGS, not treated as filters
Deno.test('nu / linux / exec (trailing args after -- are injected as WUT_ARGS)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/exec/cargo/setup/--/foo/bar?sysOsPlat=linux'))).text()
  assertEquals(body.includes(`$env.WUT_ARGS = [ r#'foo'#, r#'bar'# ]`), true)
  await checkSyntax('nu', body)
})
Deno.test('pwsh / winnt / exec (trailing args after -- are injected as WUT_ARGS)', async () => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/docker/setup/--/foo/bar?sysOsPlat=winnt'))).text()
  assertEquals(body.includes(`$WUT_ARGS = @( 'foo', 'bar' )`), true)
  await checkSyntax('pwsh', body)
})
// docker/setup redirects zsh -> pwsh (pwsh wins priority); the args must survive the hop URL
Deno.test('zsh / linux / exec (trailing args after -- survive a shell redirect)', async () => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/docker/setup/--/foo/bar?sysOsPlat=linux'))).text()
  assertEquals(body.includes('/sh/pwsh/script/exec/docker/setup/--/foo/bar'), true)
  await checkSyntax('zsh', body)
})
