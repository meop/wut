import type { Ctx } from '@meop/shire/ctx'
import type { Env } from '@meop/shire/env'
import { assertEquals } from '@std/assert'

import { buildTierChain, evaluateGate, getSupportedManagers, type TierBlock } from './pack.ts'

// --- helpers ---

function mkCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    req_orig: 'http://x',
    req_path: '/',
    req_srch: '',
    ...overrides,
  }
}

function mkEnv(packManager?: string): Env {
  return {
    store: {},
    get(key: Array<string>): string | undefined {
      return key.join('.') === 'pack.manager' ? packManager : undefined
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

// --- getSupportedManagers ---

const platMap: Record<string, Array<string>> = {
  darwin: ['brew'],
  linux: ['apk', 'apt', 'pacman'],
  winnt: ['choco', 'scoop', 'winget'],
}

const osMap: Record<string, Array<string>> = {
  alpine: ['apk'],
  arch: ['pacman'],
  ubuntu: ['apt'],
}

Deno.test('getSupportedManagers - plat only returns all plat managers', () => {
  assertEquals(
    getSupportedManagers(platMap, osMap, mkCtx({ sys_os_plat: 'linux' }), mkEnv()),
    ['apk', 'apt', 'pacman'],
  )
})

Deno.test('getSupportedManagers - plat + OS filters to intersection', () => {
  assertEquals(
    getSupportedManagers(
      platMap,
      osMap,
      mkCtx({ sys_os_plat: 'linux', sys_os: 'ubuntu' }),
      mkEnv(),
    ),
    ['apt'],
  )
})

Deno.test('getSupportedManagers - OS not in map returns all plat managers', () => {
  assertEquals(
    getSupportedManagers(
      platMap,
      osMap,
      mkCtx({ sys_os_plat: 'linux', sys_os: 'void' }),
      mkEnv(),
    ),
    ['apk', 'apt', 'pacman'],
  )
})

Deno.test('getSupportedManagers - OS substring match (sys_os contains key)', () => {
  assertEquals(
    getSupportedManagers(
      platMap,
      osMap,
      mkCtx({ sys_os_plat: 'linux', sys_os: 'ubuntu 22.04' }),
      mkEnv(),
    ),
    ['apt'],
  )
})

Deno.test('getSupportedManagers - OS longest key wins', () => {
  const osMapWithSubkey: Record<string, Array<string>> = {
    ubuntu: ['apt'],
    'ubuntu 22': ['apt'],
  }
  assertEquals(
    getSupportedManagers(
      platMap,
      osMapWithSubkey,
      mkCtx({ sys_os_plat: 'linux', sys_os: 'ubuntu 22.04' }),
      mkEnv(),
    ),
    ['apt'],
  )
})

Deno.test('getSupportedManagers - no plat returns empty', () => {
  assertEquals(
    getSupportedManagers(platMap, osMap, mkCtx(), mkEnv()),
    [],
  )
})

Deno.test('getSupportedManagers - unknown plat returns empty', () => {
  assertEquals(
    getSupportedManagers(
      platMap,
      osMap,
      mkCtx({ sys_os_plat: 'freebsd' }),
      mkEnv(),
    ),
    [],
  )
})

Deno.test('getSupportedManagers - PACK_MANAGER filter narrows to one', () => {
  assertEquals(
    getSupportedManagers(
      platMap,
      osMap,
      mkCtx({ sys_os_plat: 'linux' }),
      mkEnv('apt'),
    ),
    ['apt'],
  )
})

Deno.test('getSupportedManagers - PACK_MANAGER filter not in plat returns empty', () => {
  assertEquals(
    getSupportedManagers(
      platMap,
      osMap,
      mkCtx({ sys_os_plat: 'darwin' }),
      mkEnv('apt'),
    ),
    [],
  )
})

// --- buildTierChain ---

Deno.test('buildTierChain - two tiers produce correct nushell structure', () => {
  const tiers: Array<TierBlock> = [
    { label: 'tier-a', lines: ['doA'] },
    { label: 'tier-b', lines: ['doB'] },
  ]
  assertEquals(buildTierChain(tiers), [
    'do --env {',
    `mut yn = ''`,
    `if 'YES' in $env {`,
    `  $yn = 'y'`,
    `} else {`,
    `  $yn = input r#'? tier-a [y, [n]]: '#`,
    `}`,
    `if $yn != 'n' {`,
    'doA',
    `} else {`,
    `$yn = ''`,
    `if 'YES' in $env {`,
    `  $yn = 'y'`,
    `} else {`,
    `  $yn = input r#'? tier-b [y, [n]]: '#`,
    `}`,
    `if $yn != 'n' {`,
    'doB',
    `}`,
    `}`,
    `}`,
  ])
})

Deno.test('buildTierChain - three tiers have two nested else branches', () => {
  const tiers: Array<TierBlock> = [
    { label: 'a', lines: ['lineA'] },
    { label: 'b', lines: ['lineB'] },
    { label: 'c', lines: ['lineC'] },
  ]
  const result = buildTierChain(tiers)
  // Outer wrapper
  assertEquals(result[0], 'do --env {')
  assertEquals(result[result.length - 1], '}')
  // First tier uses mut, subsequent use assignment
  assertEquals(result[1], `mut yn = ''`)
  const ynAssigns = result.filter((l) => l === `$yn = ''`)
  assertEquals(ynAssigns.length, 2)
  // All three prompts present
  const prompts = result.filter((l) => l.includes(`input r#'?`))
  assertEquals(prompts.length, 3)
  // tier bodies present
  assertEquals(result.includes('lineA'), true)
  assertEquals(result.includes('lineB'), true)
  assertEquals(result.includes('lineC'), true)
})

Deno.test('buildTierChain - tier lines are preserved verbatim', () => {
  const tiers: Array<TierBlock> = [
    { label: 'x', lines: ['$env.FOO = "bar"', 'someFunc'] },
    { label: 'y', lines: ['otherFunc'] },
  ]
  const result = buildTierChain(tiers)
  assertEquals(result.includes('$env.FOO = "bar"'), true)
  assertEquals(result.includes('someFunc'), true)
  assertEquals(result.includes('otherFunc'), true)
})
