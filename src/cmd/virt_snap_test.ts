import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu × linux (docker + qemu)
Deno.test('nu / linux / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/tidy?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin (docker only)
Deno.test('nu / darwin / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/tidy?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt (docker only)
Deno.test('nu / winnt / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/tidy?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux × host (with sysHost — exercises real instance config loading)
Deno.test('nu / linux / add (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / list (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / list (host podman)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list/podman?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / rem (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / sync (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux × host × find with filter (exercises substring filter direction)
Deno.test('nu / linux / find (host test)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find/test?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find (host test2)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find/test2?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
