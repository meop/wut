import { assertEquals } from '@std/assert'

import { req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu resolves an unknown command as an external one and fails when the line runs, so a helper that exists nowhere
// is invisible to both the snapshots and the syntax check — it only shows up when someone runs the command
const DEFINES = /(?:^|\n)\s*(?:def(?:\s+--env)?|function)\s+(?:--env\s+)?([A-Za-z][\w-]*)/g
const CMD_STARTS = /(?:^|[\n{;|(])\s*([a-z][A-Za-z0-9]*)/g
const OURS = /^(?:pack|file|script|virt|op)[A-Z]/

// a call inside a def only runs if something calls that def — virtCallManager names every manager though one is
// ever loaded — so it just has to exist somewhere. a call outside one runs for certain, and has to be right here.
// every def in a rendered body opens at column 0 and closes on a column 0 '}'
function splitByReach(body: string): { runs: string; maybe: string } {
  const runs: Array<string> = []
  const maybe: Array<string> = []
  let inDef = false
  for (const line of body.split('\n')) {
    if (!inDef && /^def\s/.test(line)) {
      inDef = true
    }
    ;(inDef ? maybe : runs).push(line)
    if (inDef && line === '}') {
      inDef = false
    }
  }
  return { runs: runs.join('\n'), maybe: maybe.join('\n') }
}

const PATHS = [
  ...['add/nu', 'find/nu', 'find', 'info', 'list', 'outdated', 'remove/nu', 'sync', 'tidy']
    .map((p) => `pack/${p}`),
  ...['diff/zsh', 'find', 'list/zsh', 'sync/zsh', 'sync/ssh'].map((p) => `file/${p}`),
  ...['find', 'exec/setup', 'exec/setup/cargo'].map((p) => `script/${p}`),
  ...['add', 'find', 'list', 'rem', 'run/test', 'sync', 'tidy'].map((p) => `virt/${p}`),
]

function callsIn(text: string): Array<string> {
  return [...text.matchAll(CMD_STARTS)].map((m) => m[1]).filter((n) => OURS.test(n))
}

async function render(plat: string, path: string): Promise<string> {
  return await (await runSrv(
    req(`/sh/nu/${path}?sysOsPlat=${plat}&sysOs=arch&sysHost=host&wutNuPinned=1`),
  )).text()
}

Deno.test('a helper called where it certainly runs is defined by that same body', async () => {
  const missing: Array<string> = []
  for (const plat of ['linux', 'winnt']) {
    for (const path of PATHS) {
      const body = await render(plat, path)
      const defined = new Set([...body.matchAll(DEFINES)].map((m) => m[1]))
      for (const name of new Set(callsIn(splitByReach(body).runs))) {
        if (!defined.has(name)) {
          missing.push(`${name} (${plat} ${path})`)
        }
      }
    }
  }
  assertEquals(missing.toSorted(), [])
})

Deno.test('a helper called inside a def exists in some body', async () => {
  const defined = new Set<string>()
  const called = new Map<string, string>()
  for (const plat of ['linux', 'winnt']) {
    for (const path of PATHS) {
      const body = await render(plat, path)
      for (const m of body.matchAll(DEFINES)) {
        defined.add(m[1])
      }
      for (const name of callsIn(splitByReach(body).maybe)) {
        if (!called.has(name)) {
          called.set(name, `${plat} ${path}`)
        }
      }
    }
  }
  const missing = [...called.entries()]
    .filter(([name]) => !defined.has(name))
    .map(([name, where]) => `${name} (${where})`)
  assertEquals(missing.toSorted(), [])
})
