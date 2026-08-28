import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// every caller lands in nu, which owns the whole (nu ∪ zsh ∪ pwsh) listing
Deno.test('nu / linux / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// pwsh × windows
Deno.test('pwsh / windows / find', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/find?sysOsPlat=windows'))).text()
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
  const body = await (await runSrv(req('/sh/nu/script/exec/install?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('no script matched: install'), true)
})
Deno.test('nu / windows / exec (no match, warns)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/install?sysOsPlat=windows&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('pwsh / windows / exec', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/install?sysOsPlat=windows'))).text()
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
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/cargo?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('zsh / linux / exec (overlay stays in the calling shell, cargo)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/setup/cargo?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('pwsh / windows / exec (overlay stays in the calling shell)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/setup/cargo?sysOsPlat=windows'))).text()
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
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/orphan?sysOsPlat=linux&wutNuPinned=1'))).text()
  assertEquals(body.includes('this script is intentionally undeclared'), false)
})

// "--" separates match tokens from trailing script args, written into the spawned script in the syntax of the
// shell that will read it, not into the nu that spawns it
Deno.test('nu / linux / exec (trailing args after -- are written in zsh syntax)', async () => {
  const body = await (await runSrv(
    req('/sh/nu/script/exec/setup/cargo/--/foo/bar?sysOsPlat=linux&wutNuPinned=1'),
  )).text()
  assertEquals(body.includes(`WUT_ARGS=( 'foo' 'bar' )`), true)
  await checkSyntax('nu', body)
})
// the same script on windows is owned by its pwsh copy, so the same args are written in pwsh syntax
Deno.test('nu / windows / exec (trailing args after -- are written in pwsh syntax)', async () => {
  const body = await (await runSrv(
    req('/sh/nu/script/exec/setup/cargo/--/foo/bar?sysOsPlat=windows&wutNuPinned=1'),
  )).text()
  assertEquals(body.includes(`$WUT_ARGS = @( 'foo', 'bar' )`), true)
  await checkSyntax('nu', body)
})

// an action with no tool fans out into one plan: every script gated for this machine, each spawned in the shell
// that owns it, and no hop back to wut for any of them
Deno.test('nu / linux / exec (action only, one plan, no hop)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('/sh/zsh/script/exec'), false)
  assertEquals(body.includes('/sh/pwsh/script/exec'), false)
  assertEquals(body.includes('"tool":"cargo"'), true)
  assertEquals(body.includes('"tool":"docker"'), true)
})
// a zsh caller does not render any of this: it hops to nu once, like pack, file and virt already do
Deno.test('zsh / linux / exec (redirects to nu)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/setup?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
  assertEquals(body.includes('/sh/nu/script/exec/setup?sysOsPlat=linux&wutNuPinned=1'), true)
})

// has_cmd is a client side gate: find hands the listing over so the client drops tools it does not have
Deno.test('nu / linux / find (client side has_cmd listing)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("scriptFindAdd r#'setup'# r#'cargo=cargo'# r#'docker=docker'#"), true)
  assertEquals(body.includes('scriptFindShow'), true)
})
// an action alone carries each tool's has_cmd into the plan, so the client drops what it cannot run
Deno.test('nu / linux / exec (action only, carries has_cmd into the plan)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"cmds":["cargo"]'), true)
})
// a named tool is never gated, so its own 'not installed' warning still explains the no op
Deno.test('nu / linux / exec (named tool is not gated)', async () => {
  const body = await (await runSrv(req('/sh/nu/script/exec/setup/cargo?sysOsPlat=linux&wutNuPinned=1'))).text()
  assertEquals(body.includes('"cmds":[]'), true)
  assertEquals(body.includes("opPrintWarn 'cargo is not installed'"), true)
  await checkSyntax('nu', body)
})
