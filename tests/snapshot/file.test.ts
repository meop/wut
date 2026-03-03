import { assertSnapshot } from '@std/testing/snapshot'
import { runSrv } from '../../src/srv.ts'
import { checkSyntax, req } from '../helpers.ts'

// nu × linux
Deno.test('nu / linux / diff', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/diff?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin
Deno.test('nu / darwin / diff', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/diff?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt
Deno.test('nu / winnt / diff', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/diff?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/file/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
