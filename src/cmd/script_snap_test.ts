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

// exec tests — no fixture declares an install action, so these are the no match path
Deno.test('nu / linux / exec (no match, warns)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/install?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('no script matched: install'), true)
})
Deno.test('nu / winnt / exec (no match, warns)', async (t) => {
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
  const body = await (await runSrv(req('/sh/zsh/script/exec/setup/docker?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
// docker exists under both pwsh and zsh, both gated to linux — the calling shell wins, so zsh runs its own copy
Deno.test('zsh / linux / exec (overlay stays in the calling shell)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/setup/docker?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// overlay: cargo exists under nu, zsh, and pwsh — whichever shell called runs its own copy, no hop
Deno.test('nu / linux / exec (overlay, already nu)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/cargo?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('zsh / linux / exec (overlay stays in the calling shell, cargo)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/setup/cargo?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('pwsh / winnt / exec (overlay stays in the calling shell)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/setup/cargo?sysOsPlat=winnt'))).text()
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
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/orphan?sysOsPlat=linux'))).text()
  assertEquals(body.includes('this script is intentionally undeclared'), false)
})

// "--" separates match tokens from trailing script args, injected as $WUT_ARGS, not treated as filters
Deno.test('nu / linux / exec (trailing args after -- are injected as WUT_ARGS)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/cargo/--/foo/bar?sysOsPlat=linux'))).text()
  assertEquals(body.includes(`$env.WUT_ARGS = [ r#'foo'#, r#'bar'# ]`), true)
  await checkSyntax('nu', body)
})
Deno.test('pwsh / winnt / exec (trailing args after -- are injected as WUT_ARGS)', async () => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/setup/docker/--/foo/bar?sysOsPlat=winnt'))).text()
  assertEquals(body.includes(`$WUT_ARGS = @( 'foo', 'bar' )`), true)
  await checkSyntax('pwsh', body)
})
// docker/setup has no nu copy, so nu hops to zsh (most native of what is left); the args must survive the hop URL
Deno.test('nu / linux / exec (trailing args after -- survive a shell redirect)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/docker/--/foo/bar?sysOsPlat=linux'))).text()
  assertEquals(body.includes('/sh/zsh/script/exec/setup/docker/--/foo/bar'), true)
  await checkSyntax('nu', body)
})

// an action with no tool fans out: every script gated for this machine, each in the shell that owns it
Deno.test('zsh / linux / exec (action only, both scripts are native, no hop)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
  assertEquals(body.includes('/sh/nu/script/exec'), false)
  assertEquals(body.includes('/sh/pwsh/script/exec'), false)
})
Deno.test('nu / linux / exec (action only, runs its own and hops the rest)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  // cargo has a nu copy so it stays inline; docker does not, so it hops to zsh over pwsh
  assertEquals(body.includes('/sh/zsh/script/exec/setup?sysOsPlat=linux&wutShellOnly=zsh&wutShellFrom=nu'), true)
})
// a fan out hop is marked, so the target runs only what it owns and never hops back
Deno.test('zsh / linux / exec (action only, shell only hop from nu)', async (t) => {
  const body = await (await runSrv(
    req('/sh/zsh/script/exec/setup?sysOsPlat=linux&wutShellOnly=zsh&wutShellFrom=nu'),
  )).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
  assertEquals(body.includes('/sh/nu/script/exec'), false)
  assertEquals(body.includes('/sh/pwsh/script/exec'), false)
})
// wutShellFrom is what keeps the two sides of a hop agreeing: the leaf must not re-claim what its caller kept
Deno.test('zsh / linux / exec (shell only hop runs what its caller left it)', async () => {
  const body = await (await runSrv(
    req('/sh/zsh/script/exec/setup?sysOsPlat=linux&wutShellOnly=zsh&wutShellFrom=nu'),
  )).text()
  assertEquals(body.includes('setup docker via zsh'), true)
  // cargo stayed with nu, so the zsh leaf must not run its zsh copy as well
  assertEquals(body.includes('setup cargo - install tools'), false)
})

// has_cmd is a client side gate: find hands the listing over so the client drops tools it does not have
Deno.test('zsh / linux / find (client side has_cmd listing)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
  assertEquals(body.includes("scriptFindGroup 'setup' 'cargo=cargo' 'docker=docker'"), true)
})
// a fanned out block is wrapped, so a client without the tool never sees its prompt
Deno.test('nu / linux / exec (action only, gates each block on has_cmd)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("if (scriptHasCmd r#'cargo'#) {"), true)
})
// a named tool is never gated, so its own 'not installed' warning still explains the no op
Deno.test('nu / linux / exec (named tool is not gated)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/cargo?sysOsPlat=linux'))).text()
  assertEquals(body.includes('scriptHasCmd'), false)
  assertEquals(body.includes("opPrintWarn 'cargo is not installed'"), true)
  await checkSyntax('nu', body)
})
