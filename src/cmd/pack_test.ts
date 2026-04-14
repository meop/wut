import type { Ctx } from '@meop/shire/ctx'
import type { Env } from '@meop/shire/env'
import { assertEquals } from '@std/assert'

import {
  buildTierChain,
  evaluateGate,
  getManagerFuncName,
  getSupportedManagers,
  parseScriptFilePath,
  resolveGroupName,
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

Deno.test('buildTierChain - single tier produces direct if branch', () => {
  const tiers: Array<TierBlock> = [
    { label: 'only', lines: ['doOnly'] },
  ]
  assertEquals(buildTierChain(tiers), [
    'do --env {',
    `mut yn = ''`,
    `if 'YES' in $env {`,
    `  $yn = 'y'`,
    `} else {`,
    `  $yn = input r#'? only [y, [n]]: '#`,
    `}`,
    `if $yn != 'n' {`,
    'doOnly',
    `}`,
    `}`,
  ])
})

Deno.test('buildTierChain - many lines per tier are all present', () => {
  const tiers: Array<TierBlock> = [
    { label: 'a', lines: ['line1', 'line2', 'line3'] },
    { label: 'b', lines: ['line4'] },
  ]
  const result = buildTierChain(tiers)
  for (const line of ['line1', 'line2', 'line3', 'line4']) {
    assertEquals(result.includes(line), true)
  }
})

Deno.test('buildTierChain - first tier uses mut, rest use assignment', () => {
  const tiers: Array<TierBlock> = [
    { label: 'a', lines: ['doA'] },
    { label: 'b', lines: ['doB'] },
    { label: 'c', lines: ['doC'] },
  ]
  const result = buildTierChain(tiers)
  assertEquals(result.filter((l) => l === `mut yn = ''`).length, 1)
  assertEquals(result.filter((l) => l === `$yn = ''`).length, 2)
})

// --- parseScriptFilePath ---

Deno.test('parseScriptFilePath - strips cfg/ prefix and splits path', () => {
  assertEquals(parseScriptFilePath('cfg/script/zsh/setup/rust.zsh'), {
    parts: ['script', 'zsh', 'setup', 'rust'],
    ext: 'zsh',
  })
})

Deno.test('parseScriptFilePath - no cfg/ prefix still works', () => {
  assertEquals(parseScriptFilePath('script/zsh/rust.sh'), {
    parts: ['script', 'zsh', 'rust'],
    ext: 'sh',
  })
})

Deno.test('parseScriptFilePath - no extension returns empty ext', () => {
  assertEquals(parseScriptFilePath('cfg/some/file'), {
    parts: ['some', 'file'],
    ext: '',
  })
})

Deno.test('parseScriptFilePath - last dot determines extension', () => {
  assertEquals(parseScriptFilePath('cfg/file.tar.gz'), {
    parts: ['file.tar'],
    ext: 'gz',
  })
})

Deno.test('parseScriptFilePath - single filename', () => {
  assertEquals(parseScriptFilePath('cfg/script.ps1'), {
    parts: ['script'],
    ext: 'ps1',
  })
})

// --- getManagerFuncName ---

Deno.test('getManagerFuncName - basic name', () => {
  assertEquals(getManagerFuncName('pacman'), 'packPacman')
})

Deno.test('getManagerFuncName - empty string returns empty', () => {
  assertEquals(getManagerFuncName(''), '')
})

Deno.test('getManagerFuncName - strips hyphens', () => {
  assertEquals(getManagerFuncName('some-manager'), 'packSomemanager')
})

Deno.test('getManagerFuncName - strips underscores', () => {
  assertEquals(getManagerFuncName('some_manager'), 'packSomemanager')
})

Deno.test('getManagerFuncName - uppercases first letter only', () => {
  assertEquals(getManagerFuncName('ABC'), 'packAbc')
})

Deno.test('getManagerFuncName - custom prefix', () => {
  assertEquals(getManagerFuncName('docker', 'virt'), 'virtDocker')
})

// --- resolveGroupName ---

Deno.test('resolveGroupName - suffix match finds group', async () => {
  const result = await resolveGroupName('nushell')
  assertEquals(result.includes('shell-nushell'), true)
})

Deno.test('resolveGroupName - prefix match finds groups', async () => {
  const result = await resolveGroupName('shell')
  assertEquals(result.length >= 1, true)
  assertEquals(result.includes('shell-nushell'), true)
})

Deno.test('resolveGroupName - multi-part prefix match', async () => {
  const result = await resolveGroupName('shell')
  assertEquals(result.length >= 1, true)
  assertEquals(result.every((r) => r.startsWith('shell-')), true)
})

Deno.test('resolveGroupName - no match returns empty', async () => {
  const result = await resolveGroupName('xyznonexistent')
  assertEquals(result, [])
})

Deno.test('resolveGroupName - full name exact match', async () => {
  const result = await resolveGroupName('shell-nushell')
  assertEquals(result.includes('shell-nushell'), true)
})

Deno.test('resolveGroupName - name longer than any path returns empty', async () => {
  const result = await resolveGroupName('a-b-c-d-e-f-g')
  assertEquals(result, [])
})
