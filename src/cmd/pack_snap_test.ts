import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu × alpine (apk)
Deno.test('nu / alpine / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / alpine / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=alpine'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × arch (the pacman family, which the client collapses to one)
Deno.test('nu / arch / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
// 'shell' resolves to two groups (shell-nu, shell-zsh): add is WIDE (both), rem is PINPOINT (first only)
Deno.test('nu / arch / add (shell group) — wide', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/shell?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / rem (shell group) — pinpoint', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/shell?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / arch / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × rocky (dnf)
Deno.test('nu / rocky / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / rocky / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=rocky'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × ubuntu (apt)
Deno.test('nu / ubuntu / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / ubuntu / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=ubuntu'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × void (xbps)
Deno.test('nu / void / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / void / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=void'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × suse (zypper)
Deno.test('nu / suse / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / suse / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=linux&sysOs=suse'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin (brew)
Deno.test('nu / darwin / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × windows (choco + scoop + winget)
Deno.test('nu / windows / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find/firefox?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/list?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / out', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/out?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/rem/firefox?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/sync?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / windows / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/tidy?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × windows × find (no names — exercises PACK_FIND_NAMES='')
Deno.test('nu / windows / find (no names)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin × find (no names)
Deno.test('nu / darwin / find (no names)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin × add (claude) — multi-tier: script + system
Deno.test('nu / darwin / add (claude)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/claude?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × windows × add (claude) — buildTierChain on windows: script(pwsh) + system(winget)
Deno.test('nu / windows / add (claude)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/claude?sysOsPlat=windows'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin × add (rust) — buildTierChain: script(zsh) + system(brew) + setup block
Deno.test('nu / darwin / add (rust)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/rust?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × arch × add (nushell) — buildTierChain: user(cargo) + system(pacman)
Deno.test('nu / arch / add (nushell)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/nushell?sysOsPlat=linux&sysOs=arch'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × ubuntu × add (nushell) — gate(sys_os_like) + file script entry: user(cargo) + script(file, gate debian)
Deno.test('nu / ubuntu / add (nushell)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/nushell?sysOsPlat=linux&sysOs=ubuntu&sysOsLike=debian'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin × add (ai-code) — prefix resolution: expands to all files under ai/code/
Deno.test('nu / darwin / add (ai-code)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/ai-code?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × no-sys (bootstrap path)
Deno.test('nu / no-sys / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/firefox'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// the pinned hop is where the real body lives: everything above only captures the redirect to it

// no -m: the union of every manager this client supports
Deno.test('nu / arch / find (no manager, pinned)', async (t) => {
  const body = await (await runSrv(
    req('/sh/nu/pack/find?sysOsPlat=linux&sysOs=arch&wutNuPinned=1'),
  )).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"shell-nu":['), true)
  assertEquals(body.includes('packPacman'), true)
})

const PIN_ARCH = 'sysOsPlat=linux&sysOs=arch&wutNuPinned=1'

// a group name resolves to each manager's own name for it
Deno.test('nu / arch / add (pinned, nu group)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/add/nu?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.PACK_ADD_NAMES = [ r#'nushell'# ]"), true)
  assertEquals(body.includes('packPacman'), true)
  // the user tier keeps its own name for the same group
  assertEquals(body.includes("$env.PACK_ADD_NAMES = [ r#'nu'# ]"), true)
})
Deno.test('nu / arch / rem (pinned, nu group)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/rem/nu?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.PACK_REMOVE_NAMES = [ r#'nushell'# ]"), true)
})
// the documented cardinality split: add takes every matching group, rem takes one
Deno.test('nu / arch / add (pinned, shell matches both groups)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/add/shell?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"group":"shell-nu"'), true)
  assertEquals(body.includes('"group":"shell-zsh"'), true)
})
Deno.test('nu / arch / rem (pinned, shell takes the first group only)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/rem/shell?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"group":"shell-nu"'), true)
  assertEquals(body.includes('"group":"shell-zsh"'), false)
})
// every manager the group declares gets a block; a gated entry still does not
Deno.test('nu / ubuntu / add (pinned, rustup)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/rustup?sysOsPlat=linux&sysOs=ubuntu&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.PACK_MANAGER = r#'apt'#"), true)
  // brew's entry is gated to darwin
  assertEquals(body.includes("$env.PACK_MANAGER = r#'brew'#"), false)
})
// a script "file" entry is spawned as its own process at runtime, so it never inherits this response's
// own op* definitions — it needs its shell's op preamble loaded into it directly (see getScriptFlavorOpPreamble)
Deno.test('nu / linux / add (pinned, script file entry carries its own op preamble)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/scriptfile?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('function opPrintWarn'), true)
  assertEquals(body.includes('function opPrintMaybeRunCmd'), true)
  assertEquals(body.includes("opPrintWarn 'fixture script for buildFileRunLines regression coverage'"), true)
})
// the manager functions are defined long before the plan, so ordering only reads inside the arm
function planArm(body: string, id: string) {
  const start = body.indexOf(`r#'${id}'# => {`)
  return start < 0 ? '' : body.slice(start).split('\n    }')[0]
}
// add taps before installing, remove untaps after uninstalling
Deno.test('nu / linux / add (pinned, manager pre hook runs before the manager call)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/add/hooks?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  const arm = planArm(body, 'test-hooks|brew')
  const hook = arm.indexOf('brew tap meop/tap')
  const call = arm.indexOf('\npackBrew')
  assertEquals(hook > -1, true)
  assertEquals(call > -1, true)
  assertEquals(hook < call, true)
})
Deno.test('nu / linux / remove (pinned, manager post hook runs after the manager call)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/remove/hooks?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  const arm = planArm(body, 'test-hooks|brew')
  const call = arm.indexOf('\npackBrew')
  const hook = arm.indexOf('brew untap meop/tap')
  assertEquals(hook > -1, true)
  assertEquals(call > -1, true)
  assertEquals(call < hook, true)
  // remove states no names of its own: the ones add declared are the ones it hands the manager
  assertEquals(arm.includes("$env.PACK_REMOVE_NAMES = [ r#'hooks'# ]"), true)
})
// a manager with nothing to undo is simply absent from remove
Deno.test('nu / linux / remove (pinned, a manager with no post hook)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/pack/remove/hooks?sysOsPlat=linux&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  const arm = planArm(body, 'test-hooks|pacman')
  assertEquals(arm.includes('packPacman'), true)
  assertEquals(arm.includes('untap'), false)
})
// name-less ops hand every supported manager its own turn
Deno.test('nu / arch / sync (pinned)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/sync?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  for (const fn of ['packGhpm', 'packCargo', 'packUv', 'packPnpm', 'packBun', 'packDeno', 'packPacman']) {
    assertEquals(body.includes(fn), true)
  }
})
Deno.test('nu / arch / tidy (pinned)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/tidy?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.PACK_OP = r#'tidy'#"), true)
  assertEquals(body.includes('packPacman'), true)
})
// a name a group already claims needs no separate manager check
Deno.test('nu / arch / find (pinned, a claimed name skips the manager check)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/find/nu?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"shell-nu":['), true)
  assertEquals(body.includes('"remaining":[]'), true)
  assertEquals(body.includes('packPacman'), true)
})

// an alias is another name for the group, for lookup only — never an install name

Deno.test('nu / arch / find (pinned, by alias)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/find/nushell?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"shell-nu":['), true)
  assertEquals(body.includes('"remaining":[]'), true)
})
Deno.test('nu / arch / add (pinned, by alias installs declared names)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/add/nushell?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.PACK_ADD_NAMES = [ r#'nu'# ]"), true)
  assertEquals(body.includes("$env.PACK_ADD_NAMES = [ r#'nushell'# ]"), true)
  // ghpm and cargo keep their own name for it, the alias is never handed to a manager
  assertEquals(body.includes("$env.PACK_MANAGER = r#'ghpm'#"), true)
})
Deno.test('nu / arch / rem (pinned, by alias)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/rem/nushell?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"group":"shell-nu"'), true)
  assertEquals(body.includes('"group":"shell-zsh"'), false)
})
// an alias that matches nothing still falls through to the managers' own search
Deno.test('nu / arch / find (pinned, unknown name)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/find/nosuchpackage?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"groups":{}'), true)
  assertEquals(body.includes('"remaining":["nosuchpackage"]'), true)
  assertEquals(body.includes('packPacman'), true)
})

// the last filter is the client's: a group whose only candidate manager is not on this PATH does not show
Deno.test('nu / arch / find (pinned, candidates travel to the client)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/find?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(
    body.includes('"shell-nu":[{"manager":"ghpm","pkg":"nu"},{"manager":"cargo","pkg":"nu"}'),
    true,
  )
})

// a gate on a manager entry was silently ignored until now, so an arch-only entry was offered everywhere
Deno.test('nu / darwin / add (pinned, manager entry gate keeps it off this platform)', async (t) => {
  const body = await (await runSrv(
    req('/sh/nu/pack/add/rustup?sysOsPlat=darwin&sysOs=darwin&wutNuPinned=1'),
  )).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("$env.PACK_ADD_NAMES = [ r#'rustup'# ]"), true)
})

// the plan is data, its bodies are code behind ids, and the client runs it after one prompt
Deno.test('nu / arch / add (pinned, emits a plan and a dispatcher)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/add/nu?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('def --env packRunUnit [id: string] {'), true)
  assertEquals(body.includes('"group":"shell-nu"'), true)
  assertEquals(body.includes('"name":"nu"'), true)
  assertEquals(body.includes('packPlanRun'), true)
  // no cascade of prompts any more
  assertEquals(body.includes("input r#'use ghpm"), false)
})
// each unit carries the cli name that produced it, so the client can fall that name through when no path works
Deno.test('nu / arch / add (pinned, units carry their cli name)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/add/shell?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"group":"shell-nu","name":"shell"'), true)
  assertEquals(body.includes('"group":"shell-zsh","name":"shell"'), true)
})
// names no group claimed are stated as loose, even when there are none, since the env dump pre-sets the key
Deno.test('nu / arch / add (pinned, claimed names are not left loose)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/pack/add/nu?${PIN_ARCH}`))).text()
  await assertSnapshot(t, body)
  assertEquals(body.includes('$env.PACK_ADD_NAMES = [  ]'), true)
})
