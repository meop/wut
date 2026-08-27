import { assertEquals } from '@std/assert'

import { req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu resolves an unknown command as an external one and fails when the line runs, so a helper that exists nowhere
// is invisible to both the snapshots and the syntax check — it only shows up when someone runs the command.
// unreachable references are fine (virtCallManager names every manager, only one is ever loaded), so the test is
// that a called helper is defined by some body, not by the body calling it
const DEFINES = /(?:^|\n)\s*(?:def(?:\s+--env)?|function)\s+(?:--env\s+)?([A-Za-z][\w-]*)/g
const CMD_STARTS = /(?:^|[\n{;|(])\s*([a-z][A-Za-z0-9]*)/g
const OURS = /^(?:pack|file|script|virt|op)[A-Z]/

const PATHS = [
  ...['add/nu', 'find/nu', 'find', 'info', 'list', 'outdated', 'remove/nu', 'sync', 'tidy']
    .map((p) => `pack/${p}`),
  ...['diff/zsh', 'find', 'list/zsh', 'sync/zsh', 'sync/ssh'].map((p) => `file/${p}`),
  ...['find', 'exec/setup', 'exec/setup/cargo'].map((p) => `script/${p}`),
  ...['add', 'find', 'list', 'rem', 'run/test', 'sync', 'tidy'].map((p) => `virt/${p}`),
]

Deno.test('every helper a rendered body calls is defined by some body', async () => {
  const defined = new Set<string>()
  const called = new Map<string, string>()

  for (const plat of ['linux', 'winnt']) {
    for (const path of PATHS) {
      const body = await (await runSrv(
        req(`/sh/nu/${path}?sysOsPlat=${plat}&sysOs=arch&sysHost=host&wutNuPinned=1`),
      )).text()
      for (const m of body.matchAll(DEFINES)) {
        defined.add(m[1])
      }
      for (const m of body.matchAll(CMD_STARTS)) {
        if (OURS.test(m[1]) && !called.has(m[1])) {
          called.set(m[1], `${plat} ${path}`)
        }
      }
    }
  }

  const missing = [...called.entries()]
    .filter(([name]) => !defined.has(name))
    .map(([name, where]) => `${name} (${where})`)
    .toSorted()
  assertEquals(missing, [])
})
