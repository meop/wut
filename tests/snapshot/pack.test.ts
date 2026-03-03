import { assertSnapshot } from '@std/testing/snapshot'
import { runSrv } from '../../src/srv.ts'
import { checkSyntax, req } from '../helpers.ts'

// nu × arch (yay + pacman)
Deno.test('nu / arch / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/find/firefox?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / list', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/list?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / out', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/out?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / rem', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/rem/firefox?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/sync?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/tidy?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × ubuntu (apt)
Deno.test('nu / ubuntu / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/find/firefox?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / list', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/list?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / out', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/out?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / rem', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/rem/firefox?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/sync?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/tidy?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × rocky (dnf)
Deno.test('nu / rocky / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/find/firefox?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / list', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/list?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / out', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/out?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / rem', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/rem/firefox?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/sync?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/tidy?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × suse (zypper)
Deno.test('nu / suse / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/find/firefox?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / list', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/list?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / out', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/out?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / rem', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/rem/firefox?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/sync?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/tidy?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin (brew)
Deno.test('nu / darwin / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/find/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / list', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / out', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/out?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / rem', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/rem/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/tidy?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt (choco + scoop + winget)
Deno.test('nu / winnt / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/find/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / list', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/list?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / out', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/out?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / rem', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/rem/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/tidy?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × no-sys (bootstrap path)
Deno.test('nu / no-sys / add', async (t) => {
  const body = await (await runSrv(req('/cli/nu/pack/add/firefox'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// pwsh × winnt (choco + scoop + winget)
Deno.test('pwsh / winnt / add', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/add/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('pwsh / winnt / find', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/find/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('pwsh / winnt / list', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/list?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('pwsh / winnt / out', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/out?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('pwsh / winnt / rem', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/rem/firefox?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('pwsh / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})
Deno.test('pwsh / winnt / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/pwsh/pack/tidy?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('pwsh', body)
})

// zsh × arch (pacman)
Deno.test('zsh / arch / add', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/add/firefox?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / arch / find', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/find/firefox?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / arch / list', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/list?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / arch / out', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/out?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / arch / rem', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/rem/firefox?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / arch / sync', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/sync?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / arch / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/tidy?sysOsPlat=linux&sysOsId=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// zsh × ubuntu (apt)
Deno.test('zsh / ubuntu / add', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/add/firefox?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / ubuntu / find', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/find/firefox?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / ubuntu / list', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/list?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / ubuntu / out', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/out?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / ubuntu / rem', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/rem/firefox?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / ubuntu / sync', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/sync?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / ubuntu / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/tidy?sysOsPlat=linux&sysOsId=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// zsh × rocky (dnf)
Deno.test('zsh / rocky / add', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/add/firefox?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / rocky / find', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/find/firefox?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / rocky / list', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/list?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / rocky / out', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/out?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / rocky / rem', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/rem/firefox?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / rocky / sync', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/sync?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / rocky / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/tidy?sysOsPlat=linux&sysOsId=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// zsh × suse (zypper)
Deno.test('zsh / suse / add', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/add/firefox?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / suse / find', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/find/firefox?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / suse / list', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/list?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / suse / out', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/out?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / suse / rem', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/rem/firefox?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / suse / sync', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/sync?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / suse / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/tidy?sysOsPlat=linux&sysOsId=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})

// zsh × darwin (brew)
Deno.test('zsh / darwin / add', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/add/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / darwin / find', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/find/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / darwin / list', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / darwin / out', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/out?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / darwin / rem', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/rem/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
Deno.test('zsh / darwin / tidy', async (t) => {
  const body = await (await runSrv(req('/cli/zsh/pack/tidy?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('zsh', body)
})
