import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu × darwin
Deno.test('nu / darwin / diff', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/diff?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux
Deno.test('nu / linux / diff', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/diff?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux × find (with filter)
Deno.test('nu / linux / find (with filter)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/find/git?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux × find (with sysHost — exercises withCtx substitution in inPart)
Deno.test('nu / linux / find (with sysHost)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/find?sysOsPlat=linux&sysHost=testhost'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin / list
Deno.test('nu / darwin / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux / list
Deno.test('nu / linux / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt
Deno.test('nu / winnt / diff', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/diff?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt / list
Deno.test('nu / winnt / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/list?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// everything above stops at the redirect; these follow it to the body the client actually runs

const PIN = 'sysOsPlat=linux&wutNuPinned=1'

Deno.test('nu / linux / find (pinned)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/find?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  // key|in-paths, one entry per config key
  assertEquals(body.includes("r#'zsh|zsh, zshenv, zshrc'#"), true)
  assertEquals(body.includes("r#'git|gitconfig'#"), true)
})
Deno.test('nu / linux / find (pinned, filtered)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/find/zsh?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("r#'zsh|zsh, zshenv, zshrc'#"), true)
  assertEquals(body.includes('gitconfig'), false)
})
// sync resolves every in path to its out path for this platform, and clears dir targets first
Deno.test('nu / linux / sync (pinned, filtered)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/sync/zsh?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("r#'zsh|zsh/zshrc|{HOME}/.zshrc'#"), true)
  assertEquals(body.includes("FILE_SYNC_CLEAR_DIRS = [ r#'zsh|{HOME}/.zsh'# ]"), true)
})
// winnt maps the same key to different out paths
Deno.test('nu / winnt / sync (pinned, filtered)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/file/sync/nu?sysOsPlat=winnt&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('{APPDATA}/nushell/config.nu'), true)
  assertEquals(body.includes('{HOME}/.config/nushell/config.nu'), false)
})
// a permission block becomes a chmod run in the platform's native shell
Deno.test('nu / linux / sync (pinned, permissions)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/sync/ssh?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('FILE_SYNC_PATH_PERMS'), true)
  assertEquals(body.includes('chmod -R a-s,u=rw,g=,o='), true)
})
Deno.test('nu / linux / diff (pinned, filtered)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/diff/zsh?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.FILE_OP = r#'diff'#"), true)
})
Deno.test('nu / linux / list (pinned, filtered)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/list/zsh?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.FILE_OP = r#'list'#"), true)
})
// a filter that matched nothing is a no op, and says so rather than syncing silently
Deno.test('nu / linux / sync (pinned, no match)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/sync/nosuchfile?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('no file matched: nosuchfile'), true)
  assertEquals(body.includes('FILE_SYNC_PATH_PAIRS'), false)
})
// an alias is a lookup key only, never an in or out path of its own
Deno.test('nu / linux / find (pinned, matches an alias)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/find/nushell?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("r#'nu,nushell|nu, env.nu, config.nu'#"), true)
  assertEquals(body.includes('gitconfig'), false)
})
// find matches on in path too, not just the key and its aliases
Deno.test('nu / linux / find (pinned, matches an in path)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/file/find/gitconfig?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("r#'git|gitconfig'#"), true)
})
