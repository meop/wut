import type { Ctx } from '@meop/shire/ctx'
import { assertEquals, assertThrows } from '@std/assert'

import { evaluateGate, getSupportedManagers, groupOrdered, isDropIn, mergeDropIn, selectScriptEntry } from './pack.ts'

// --- helpers ---

function mkCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    req_orig: 'http://x',
    req_path: '/',
    req_srch: '',
    ...overrides,
  }
}

// --- evaluateGate ---

Deno.test('evaluateGate - null gate passes', () => {
  assertEquals(evaluateGate(null, mkCtx()), true)
})

Deno.test('evaluateGate - undefined gate passes', () => {
  assertEquals(evaluateGate(undefined, mkCtx()), true)
})

Deno.test('evaluateGate - empty gate passes', () => {
  assertEquals(evaluateGate({}, mkCtx()), true)
})

Deno.test('evaluateGate - matching plat passes', () => {
  assertEquals(
    evaluateGate({ sys_os_plat: ['linux'] }, mkCtx({ sys_os_plat: 'linux' })),
    true,
  )
})

Deno.test('evaluateGate - mismatched plat fails', () => {
  assertEquals(
    evaluateGate({ sys_os_plat: ['linux'] }, mkCtx({ sys_os_plat: 'windows' })),
    false,
  )
})

Deno.test('evaluateGate - multiple values in gate, one matches', () => {
  assertEquals(
    evaluateGate(
      { sys_os_plat: ['linux', 'darwin'] },
      mkCtx({ sys_os_plat: 'darwin' }),
    ),
    true,
  )
})

Deno.test('evaluateGate - missing ctx field fails', () => {
  assertEquals(
    evaluateGate({ sys_os_plat: ['linux'] }, mkCtx()),
    false,
  )
})

Deno.test('evaluateGate - sys_os_like substring match passes', () => {
  assertEquals(
    evaluateGate(
      { sys_os_like: ['debian'] },
      mkCtx({ sys_os_like: 'debian ubuntu' }),
    ),
    true,
  )
})

Deno.test('evaluateGate - sys_os_like no substring match fails', () => {
  assertEquals(
    evaluateGate(
      { sys_os_like: ['fedora'] },
      mkCtx({ sys_os_like: 'debian ubuntu' }),
    ),
    false,
  )
})

Deno.test('evaluateGate - sys_os_like missing from ctx fails', () => {
  assertEquals(
    evaluateGate({ sys_os_like: ['debian'] }, mkCtx()),
    false,
  )
})

Deno.test('evaluateGate - multiple conditions all match passes', () => {
  assertEquals(
    evaluateGate(
      { sys_os_plat: ['linux'], sys_os: ['ubuntu'] },
      mkCtx({ sys_os_plat: 'linux', sys_os: 'ubuntu' }),
    ),
    true,
  )
})

Deno.test('evaluateGate - multiple conditions one fails', () => {
  assertEquals(
    evaluateGate(
      { sys_os_plat: ['linux'], sys_os: ['arch'] },
      mkCtx({ sys_os_plat: 'linux', sys_os: 'ubuntu' }),
    ),
    false,
  )
})

// --- selectScriptEntry ---

Deno.test('selectScriptEntry - picks the nu entry when its gate matches', () => {
  const scriptConfig = { nu: { file: 'cfg/script/ghpm/install.nu', gate: { sys_os_plat: ['linux'] } } }
  assertEquals(
    selectScriptEntry(scriptConfig, mkCtx({ sys_os_plat: 'linux' })),
    { shellFlavor: 'nu', entry: scriptConfig.nu },
  )
})

Deno.test('selectScriptEntry - picks a native shell entry when its gate matches', () => {
  const scriptConfig = { zsh: { file: 'cfg/script/docker/install.zsh', gate: { sys_os_plat: ['linux'] } } }
  assertEquals(
    selectScriptEntry(scriptConfig, mkCtx({ sys_os_plat: 'linux' })),
    { shellFlavor: 'zsh', entry: scriptConfig.zsh },
  )
})

Deno.test('selectScriptEntry - skips an entry whose gate fails, uses the next one that matches', () => {
  const scriptConfig = {
    nu: { file: 'cfg/script/foo/install.nu', gate: { sys_os_plat: ['windows'] } },
    zsh: { file: 'cfg/script/foo/install.zsh', gate: { sys_os_plat: ['linux'] } },
  }
  assertEquals(
    selectScriptEntry(scriptConfig, mkCtx({ sys_os_plat: 'linux' })),
    { shellFlavor: 'zsh', entry: scriptConfig.zsh },
  )
})

Deno.test('selectScriptEntry - entry with no gate always matches', () => {
  const scriptConfig = { pwsh: { file: 'cfg/script/choco/install.ps1' } }
  assertEquals(
    selectScriptEntry(scriptConfig, mkCtx({ sys_os_plat: 'windows' })),
    { shellFlavor: 'pwsh', entry: scriptConfig.pwsh },
  )
})

Deno.test('selectScriptEntry - no entry gate matches returns null', () => {
  const scriptConfig = { pwsh: { file: 'cfg/script/choco/install.ps1', gate: { sys_os_plat: ['windows'] } } }
  assertEquals(
    selectScriptEntry(scriptConfig, mkCtx({ sys_os_plat: 'linux' })),
    null,
  )
})

Deno.test('selectScriptEntry - undefined scriptConfig returns null', () => {
  assertEquals(
    selectScriptEntry(undefined, mkCtx({ sys_os_plat: 'linux' })),
    null,
  )
})

// --- getSupportedManagers ---

// the manager list is one ordered list: no platform or distro maps, and no way to narrow it, since the
// client's numbered prompt is what picks
Deno.test('getSupportedManagers - every manager, portable ones first', () => {
  const all = getSupportedManagers()
  assertEquals(all.slice(0, 10), ['ghpm', 'pnpm', 'deno', 'bun', 'npm', 'uv', 'rv', 'dotnet', 'go', 'cargo'])
  // a user space install is preferred over one that needs sudo
  assertEquals(all.indexOf('cargo') < all.indexOf('pacman'), true)
  assertEquals(all.includes('winget'), true)
})

// a group's managers are tried in GROUP_ORDER whatever order its yaml lists them: a project's own installer after
// every user manager and before the system's, so ghpm or cargo serves a group before its script does
Deno.test('groupOrdered - GROUP_ORDER decides, not the yaml', () => {
  assertEquals(groupOrdered(['brew', 'script', 'pacman', 'cargo', 'ghpm']), [
    'ghpm',
    'cargo',
    'script',
    'brew',
    'pacman',
  ])
  assertEquals(groupOrdered(['winget', 'script']), ['script', 'winget'])
  // go before cargo: cargo is last of the user managers
  assertEquals(groupOrdered(['cargo', 'go']), ['go', 'cargo'])
  // an unknown key goes last, in the order given
  assertEquals(groupOrdered(['zz', 'brew', 'yy']), ['brew', 'zz', 'yy'])
})

// --- manager entry gates ---

Deno.test('evaluateGate - a manager entry gate reads like a script entry gate', () => {
  const gate = { sys_os_like: ['arch'], sys_os_plat: ['linux'] }
  assertEquals(evaluateGate(gate, mkCtx({ sys_os_plat: 'linux', sys_os_like: 'arch' })), true)
  assertEquals(evaluateGate(gate, mkCtx({ sys_os_plat: 'darwin', sys_os_like: 'darwin' })), false)
  // a gate naming context the client never sent cannot pass
  assertEquals(evaluateGate(gate, mkCtx({ sys_os_plat: 'linux' })), false)
})

// --- drop-ins ---

Deno.test('isDropIn - a group file is not one', () => {
  assertEquals(isDropIn(['sys', 'build', 'linux-headers']), false)
})

Deno.test('isDropIn - levels after a dot are', () => {
  assertEquals(isDropIn(['sys', 'build', 'linux-headers.linux.debian']), true)
})

Deno.test('mergeDropIn - a manager the group lacks is added', () => {
  const base = { operation: { add: { manager: { pacman: { names: ['linux-headers'] } } } } }
  const dropIn = { operation: { add: { manager: { apt: { names: ['linux-headers-generic'] } } } } }
  assertEquals(mergeDropIn(base, dropIn, 'x'), {
    operation: {
      add: { manager: { pacman: { names: ['linux-headers'] }, apt: { names: ['linux-headers-generic'] } } },
    },
  })
})

Deno.test('mergeDropIn - names combine with the common ones, once each', () => {
  const base = { operation: { add: { manager: { apt: { names: ['a', 'b'] } } } } }
  const dropIn = { operation: { add: { manager: { apt: { names: ['b', 'c'] } } } } }
  assertEquals(mergeDropIn(base, dropIn, 'x'), { operation: { add: { manager: { apt: { names: ['a', 'b', 'c'] } } } } })
})

Deno.test('mergeDropIn - a single value set differently is an error', () => {
  assertThrows(() => mergeDropIn({ descr: 'one' }, { descr: 'two' }, 'x'))
})

Deno.test('mergeDropIn - a single value set the same is kept', () => {
  assertEquals(mergeDropIn({ descr: 'one' }, { descr: 'one' }, 'x'), { descr: 'one' })
})
