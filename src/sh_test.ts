import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'
import { NuSh } from '@meop/shire/sh/nu'
import { PowerSh } from '@meop/shire/sh/pwsh'
import { ZSh } from '@meop/shire/sh/zsh'

import { checkSyntax, req } from './_test.ts'
import { runSrv } from './srv.ts'
import { execNativeShell, execScriptShell, getScriptFlavorOpPreamble } from './sh.ts'

// pwsh → nu redirect
Deno.test('pwsh / file / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/file/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / file / sync (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/file/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / pack / add (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/pack/add/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / pack / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/pack/find/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

Deno.test('pwsh / virt / list (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/pwsh/virt/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

// zsh → nu redirect
Deno.test('zsh / file / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/file/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / file / sync (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/file/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / pack / add (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/pack/add/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / pack / find (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/pack/find/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

Deno.test('zsh / virt / list (redirect)', async (t) => {
  const body = await (await runSrv(req('/sh/zsh/virt/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// --- execNativeShell ---

Deno.test('execNativeShell - linux uses zsh', () => {
  const shell = new NuSh()
  const result = execNativeShell(shell, 'linux', 'echo hello')
  assertEquals(result.startsWith('zsh'), true)
  assertEquals(result.includes('echo hello'), true)
})

Deno.test('execNativeShell - darwin uses zsh', () => {
  const shell = new NuSh()
  const result = execNativeShell(shell, 'darwin', 'echo hello')
  assertEquals(result.startsWith('zsh'), true)
})

Deno.test('execNativeShell - winnt uses pwsh', () => {
  const shell = new NuSh()
  const result = execNativeShell(shell, 'winnt', 'echo hello')
  assertEquals(result.startsWith('pwsh'), true)
  assertEquals(result.includes('echo hello'), true)
})

Deno.test('execNativeShell - wraps command in nushell literal', () => {
  const shell = new NuSh()
  const result = execNativeShell(shell, 'linux', 'echo hello')
  assertEquals(result.includes("r#'echo hello'#"), true)
})

Deno.test('execNativeShell - special characters are safely wrapped', () => {
  const shell = new NuSh()
  const result = execNativeShell(shell, 'linux', "echo 'single quotes'")
  assertEquals(typeof result, 'string')
  assertEquals(result.length > 0, true)
})

// --- execScriptShell ---

Deno.test('execScriptShell - nu flavor on linux invokes the pinned binary, not bare nu', () => {
  const shell = new ZSh()
  const result = execScriptShell(shell, 'linux', 'nu', 'print hello')
  assertEquals(result.startsWith('"${WUT_HOME}/vendor/nu"'), true)
})

Deno.test('execScriptShell - nu flavor on winnt invokes the pinned .exe', () => {
  const shell = new PowerSh()
  const result = execScriptShell(shell, 'winnt', 'nu', 'print hello')
  assertEquals(result.startsWith('& "${env:WUT_HOME}/vendor/nu.exe"'), true)
})

Deno.test('execScriptShell - pwsh flavor delegates to execNativeShell', () => {
  const shell = new NuSh()
  assertEquals(
    execScriptShell(shell, 'winnt', 'pwsh', 'echo hello'),
    execNativeShell(shell, 'winnt', 'echo hello'),
  )
})

Deno.test('execScriptShell - zsh flavor delegates to execNativeShell', () => {
  const shell = new NuSh()
  assertEquals(
    execScriptShell(shell, 'linux', 'zsh', 'echo hello'),
    execNativeShell(shell, 'linux', 'echo hello'),
  )
})

// --- getScriptFlavorOpPreamble ---
// a "script" manager file is spawned as its own process (buildFileRunLines in pack.ts), so it never
// inherits this response's own op* helpers unless they are loaded into it directly

Deno.test('getScriptFlavorOpPreamble - zsh flavor returns zsh op helpers', async () => {
  const preamble = await getScriptFlavorOpPreamble('zsh')
  assertEquals(preamble.includes('function opPrintWarn'), true)
  assertEquals(preamble.includes('function opPrintMaybeRunCmd'), true)
})

Deno.test('getScriptFlavorOpPreamble - pwsh flavor returns pwsh op helpers', async () => {
  const preamble = await getScriptFlavorOpPreamble('pwsh')
  assertEquals(preamble.includes('function opPrintWarn'), true)
  assertEquals(preamble.includes('function opPrintMaybeRunCmd'), true)
})

Deno.test('getScriptFlavorOpPreamble - nu flavor returns nu op helpers', async () => {
  const preamble = await getScriptFlavorOpPreamble('nu')
  assertEquals(preamble.includes('def opPrintWarn'), true)
  assertEquals(preamble.includes('def opPrintMaybeRunCmd'), true)
})
