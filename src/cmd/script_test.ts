import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu → native redirect
Deno.test('nu / linux / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/script/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find (redirect)', async (t) => {
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
Deno.test('pwsh / winnt / exec (install/choco)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/script/exec/install/choco?sysOsPlat=winnt'))).text()
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
Deno.test('zsh / linux / exec (install/yay arch)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/script/exec/install/yay?sysOsPlat=linux&sysOsLike=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
