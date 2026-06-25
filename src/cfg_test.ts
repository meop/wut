import type { Ctx } from '@meop/shire/ctx'
import { assertEquals } from '@std/assert'

import {
  type CtxFilter,
  getCfgDirDump,
  getCfgFileLoad,
  localCfgPaths,
  pinpointMatch,
  preferExactMatches,
} from './cfg.ts'

// --- helpers ---

function mkCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    req_orig: 'http://x',
    req_path: '/',
    req_srch: '',
    ...overrides,
  }
}

// --- localCfgPaths ---

Deno.test('localCfgPaths - resolves existing file', async () => {
  const paths = await localCfgPaths(['file'], 'yaml')
  assertEquals(paths.length >= 1, true)
  assertEquals(paths[0].endsWith('file.yaml'), true)
})

Deno.test('localCfgPaths - non-existent file returns empty', async () => {
  const paths = await localCfgPaths(['nonexistent_xyz'], 'yaml')
  assertEquals(paths, [])
})

// --- getCfgDirDump ---

Deno.test('getCfgDirDump - returns pack yaml entries', async () => {
  const results = await getCfgDirDump(['pack'], { extension: 'yaml' })
  assertEquals(results.length > 0, true)
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('shell-nu'), true)
})

Deno.test('getCfgDirDump - extension filter excludes non-matching', async () => {
  const yamlResults = await getCfgDirDump(['pack'], { extension: 'yaml' })
  const jsonResults = await getCfgDirDump(['pack'], { extension: 'json' })
  assertEquals(yamlResults.length > 0, true)
  assertEquals(jsonResults, [])
})

Deno.test('getCfgDirDump - flexible filter matches at any depth', async () => {
  const results = await getCfgDirDump(['pack'], {
    extension: 'yaml',
    filters: ['nu'],
    flexible: true,
  })
  assertEquals(results.length >= 1, true)
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('shell-nu'), true)
})

Deno.test('getCfgDirDump - non-flexible filter matches first segment only', async () => {
  const results = await getCfgDirDump(['pack'], {
    extension: 'yaml',
    filters: ['rust'],
    flexible: false,
  })
  assertEquals(results, [])
})

Deno.test('getCfgDirDump - without options returns all yaml files', async () => {
  const results = await getCfgDirDump(['virt'], { extension: 'yaml' })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), true)
  assertEquals(names.includes('lxc'), true)
  assertEquals(names.includes('podman'), true)
})

// --- getCfgDirDump with CtxFilter ---

Deno.test('getCfgDirDump - CtxFilter matching context includes traversed path', async () => {
  const filter: CtxFilter = { qemu: { sys_os_plat: ['linux'] } }
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    context: mkCtx({ sys_os_plat: 'linux' }),
    contextFilter: filter,
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), true)
})

Deno.test('getCfgDirDump - CtxFilter non-matching context excludes traversed path', async () => {
  const filter: CtxFilter = { qemu: { sys_os_plat: ['linux'] } }
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    context: mkCtx({ sys_os_plat: 'darwin' }),
    contextFilter: filter,
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), false)
})

Deno.test('getCfgDirDump - CtxFilter partial traversal includes path', async () => {
  const filter: CtxFilter = { qemu: { sys_os_plat: ['linux'] } }
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    context: mkCtx({ sys_os_plat: 'darwin' }),
    contextFilter: filter,
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.some((n) => n.startsWith('host-')), true)
  assertEquals(names.includes('lxc'), true)
  assertEquals(names.includes('podman'), true)
})

Deno.test('getCfgDirDump - CtxFilter sys_os_like substring match', async () => {
  const filter: CtxFilter = { qemu: { sys_os_like: ['debian'] } }
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    context: mkCtx({ sys_os_plat: 'linux', sys_os_like: 'debian ubuntu' }),
    contextFilter: filter,
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), true)
})

Deno.test('getCfgDirDump - CtxFilter sys_os_like no substring match excludes', async () => {
  const filter: CtxFilter = { qemu: { sys_os_like: ['debian'] } }
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    context: mkCtx({ sys_os_plat: 'linux', sys_os_like: 'arch' }),
    contextFilter: filter,
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), false)
})

Deno.test('getCfgDirDump - CtxFilter missing context field excludes path', async () => {
  const filter: CtxFilter = { qemu: { sys_os_plat: ['linux'] } }
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    context: mkCtx(),
    contextFilter: filter,
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), false)
})

Deno.test('getCfgDirDump - without context ignores CtxFilter', async () => {
  const results = await getCfgDirDump(['virt'], {
    extension: 'yaml',
    contextFilter: { qemu: { sys_os_plat: ['linux'] } },
  })
  const names = results.map((r) => r.join('-'))
  assertEquals(names.includes('qemu'), true)
})

// --- preferExactMatches ---

Deno.test('preferExactMatches - exact segment wins over prefix sibling', () => {
  const result = preferExactMatches(
    [['setup', 'gpu'], ['setup', 'gpu-lite']],
    ['gpu'],
  )
  assertEquals(result, [['setup', 'gpu']])
})

Deno.test('preferExactMatches - no exact match keeps all glob results', () => {
  const result = preferExactMatches(
    [['setup', 'gpu'], ['setup', 'gpu-lite']],
    ['gp'],
  )
  assertEquals(result, [['setup', 'gpu'], ['setup', 'gpu-lite']])
})

Deno.test('preferExactMatches - exact match on dir segment', () => {
  const result = preferExactMatches(
    [['gpu', 'main'], ['gpu-lite', 'main']],
    ['gpu'],
  )
  assertEquals(result, [['gpu', 'main']])
})

Deno.test('preferExactMatches - applies each filter term independently', () => {
  const result = preferExactMatches(
    [['render', 'gpu'], ['render', 'gpu-lite'], ['compute', 'gpu']],
    ['render', 'gpu'],
  )
  assertEquals(result, [['render', 'gpu']])
})

Deno.test('preferExactMatches - exact alias wins (key+aliases shape)', () => {
  const result = preferExactMatches(
    [['git', 'g'], ['github', 'gh']],
    ['g'],
  )
  assertEquals(result, [['git', 'g']])
})

Deno.test('preferExactMatches - all exact keeps all', () => {
  const result = preferExactMatches(
    [['render', 'gpu'], ['compute', 'gpu']],
    ['gpu'],
  )
  assertEquals(result, [['render', 'gpu'], ['compute', 'gpu']])
})

// --- pinpointMatch ---

Deno.test('pinpointMatch - exact wins then single result', () => {
  const result = pinpointMatch(
    [['setup', 'gpu'], ['setup', 'gpu-lite']],
    ['gpu'],
  )
  assertEquals(result, [['setup', 'gpu']])
})

Deno.test('pinpointMatch - no exact match takes first sorted', () => {
  const result = pinpointMatch(
    [['setup', 'gpu'], ['setup', 'gpu-lite']],
    ['gp'],
  )
  assertEquals(result, [['setup', 'gpu']])
})

Deno.test('pinpointMatch - never returns more than one', () => {
  const result = pinpointMatch(
    [['render', 'gpu'], ['compute', 'gpu']],
    ['gpu'],
  )
  assertEquals(result.length, 1)
})

Deno.test('pinpointMatch - empty when nothing matches', () => {
  const result = pinpointMatch([], ['gpu'])
  assertEquals(result, [])
})

// --- getCfgFileLoad ---

Deno.test('getCfgFileLoad - loads and parses file.yaml', async () => {
  const result = await getCfgFileLoad(['file'], { extension: 'yaml' })
  assertEquals(result !== null, true)
  assertEquals(typeof result, 'object')
  assertEquals('git' in result, true)
})

Deno.test('getCfgFileLoad - loads pack config with add/system tiers', async () => {
  const result = await getCfgFileLoad(['pack', 'shell', 'nu'], { extension: 'yaml' })
  assertEquals(result !== null, true)
  assertEquals(typeof result.add, 'object')
  assertEquals(typeof result.add.system, 'object')
})

Deno.test('getCfgFileLoad - non-existent file returns null', async () => {
  const result = await getCfgFileLoad(['nonexistent_xyz'], { extension: 'yaml' })
  assertEquals(result, null)
})
