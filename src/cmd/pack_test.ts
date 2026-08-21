import type { Ctx } from '@meop/shire/ctx'
import type { Env } from '@meop/shire/env'
import { assertEquals } from '@std/assert'

import {
  buildTierChain,
  evaluateGate,
  getManagerFuncName,
  getRequestedManagers,
  getSupportedManagers,
  parseScriptFilePath,
  resolveGroupName,
  selectScriptEntry,
  type TierBlock,
} from './pack.ts'

// --- helpers ---

function mkCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    req_orig: 'http://x',
    req_path: '/',
    req_srch: '',
    ...overrides,
  }
}

function mkEnv(packManagers?: string): Env {
  return {
    store: {},
    get(key: Array<string>): string | undefined {
      return key.join('.') === 'pack.managers' ? packManagers : undefined
    },
    getSplit(_key: Array<string>): Array<string> {
      return []
    },
    set(_key: Array<string>, _value: string): void {},
    setAppend(_key: Array<string>, _value: string): void {},
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
    evaluateGate({ sys_os_plat: ['linux'] }, mkCtx({ sys_os_plat: 'winnt' })),
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
    nu: { file: 'cfg/script/foo/install.nu', gate: { sys_os_plat: ['winnt'] } },
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
    selectScriptEntry(scriptConfig, mkCtx({ sys_os_plat: 'winnt' })),
    { shellFlavor: 'pwsh', entry: scriptConfig.pwsh },
  )
})

Deno.test('selectScriptEntry - no entry gate matches returns null', () => {
  const scriptConfig = { pwsh: { file: 'cfg/script/choco/install.ps1', gate: { sys_os_plat: ['winnt'] } } }
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

// the manager list is one ordered list now: no platform or distro maps, -m filters and orders it
Deno.test('getSupportedManagers - no -m returns every manager, in preference order', () => {
  const all = getSupportedManagers(mkEnv())
  assertEquals(all[0], 'ghpm')
  assertEquals(all.includes('pacman'), true)
  assertEquals(all.includes('winget'), true)
})

Deno.test('getSupportedManagers - -m filters and orders', () => {
  assertEquals(getSupportedManagers(mkEnv('pacman,ghpm')), ['pacman', 'ghpm'])
  assertEquals(getSupportedManagers(mkEnv('ghpm,pacman')), ['ghpm', 'pacman'])
})

Deno.test('getSupportedManagers - -m drops names wut does not know', () => {
  assertEquals(getSupportedManagers(mkEnv('bogus,pacman')), ['pacman'])
})

Deno.test('getSupportedManagers - naming only script leaves no managers', () => {
  assertEquals(getSupportedManagers(mkEnv('script')), [])
})

Deno.test('getRequestedManagers - splits, trims, and drops empties', () => {
  assertEquals(getRequestedManagers(mkEnv(' pacman , ghpm ,')), ['pacman', 'ghpm'])
  assertEquals(getRequestedManagers(mkEnv()), [])
})

// --- manager entry gates ---

Deno.test('evaluateGate - a manager entry gate reads like a script entry gate', () => {
  const gate = { sys_os_like: ['arch'], sys_os_plat: ['linux'] }
  assertEquals(evaluateGate(gate, mkCtx({ sys_os_plat: 'linux', sys_os_like: 'arch' })), true)
  assertEquals(evaluateGate(gate, mkCtx({ sys_os_plat: 'darwin', sys_os_like: 'darwin' })), false)
  // a gate naming context the client never sent cannot pass
  assertEquals(evaluateGate(gate, mkCtx({ sys_os_plat: 'linux' })), false)
})
