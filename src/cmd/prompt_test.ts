import { assertEquals } from '@std/assert'

import { req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// every op filters by what is installed, shows a table, and asks once — find included. that rule kept drifting
// while it lived only in prose, so it is asserted here instead.
//
// two things are checkable. a prompt must sit inside a def, because a plan runner is the only thing that reaches
// one after filtering — an inline prompt at top level is the gatedFunc shape that asked before it knew anything,
// and is what let pack find ask twice. and an op that should ask must actually reach a def that prompts.
//
// the reverse is not checkable: file routes every op through one `file` def whose sync and find arms both prompt,
// so static analysis cannot tell that `file list` does not. those are named in docs/OPS.md instead.
//
// a script's own 'setup cargo - ...' question is not wut's gate and is allowed to sit inline, so the inline check
// looks for the 'use <cmd>' gate specifically

const PROMPT = '[y,[n]]'
const GATE = /use \w+ \[y,\[n\]\]/

function defBodies(body: string): Map<string, string> {
  const out = new Map<string, string>()
  let name: string | null = null
  let buf: Array<string> = []
  for (const line of body.split('\n')) {
    if (name === null) {
      const m = /^def\s+(?:--env\s+)?([A-Za-z][\w-]*)/.exec(line)
      if (m) {
        name = m[1]
        buf = []
      }
    } else if (line === '}') {
      out.set(name, buf.join('\n'))
      name = null
    } else {
      buf.push(line)
    }
  }
  return out
}

function topLevel(body: string): string {
  const keep: Array<string> = []
  let inDef = false
  for (const line of body.split('\n')) {
    if (!inDef && /^def\s/.test(line)) {
      inDef = true
    }
    if (!inDef) {
      keep.push(line)
    }
    if (inDef && line === '}') {
      inDef = false
    }
  }
  return keep.join('\n')
}

const calls = (text: string, name: string) => new RegExp(`(?:^|[\\n{;|(])\\s*${name}\\b`).test(text)

// a def prompts if it holds the question or calls something that does — packFindRun asks through packPrompt
function promptingDefs(body: string): Set<string> {
  const defs = defBodies(body)
  const prompting = new Set([...defs].filter(([, b]) => b.includes(PROMPT)).map(([n]) => n))
  for (let changed = true; changed;) {
    changed = false
    for (const [n, b] of defs) {
      if (!prompting.has(n) && [...prompting].some((p) => calls(b, p))) {
        prompting.add(n)
        changed = true
      }
    }
  }
  return prompting
}

function asks(body: string): boolean {
  return [...promptingDefs(body)].some((n) => calls(topLevel(body), n))
}

const ASKING = [
  'pack/find',
  'pack/find/nu',
  'pack/add/nu',
  'pack/remove/nu',
  'pack/list',
  'pack/outdated',
  'pack/info',
  'pack/sync',
  'pack/tidy',
  'file/find',
  'file/sync/zsh',
  'script/find',
  'script/exec/setup',
  'virt/find',
  'virt/list',
  'virt/add/qemu',
  'virt/rem/qemu',
  'virt/run/test',
  'virt/sync',
  'virt/tidy',
]

const PARAMS = 'sysOsPlat=linux&sysOs=arch&sysHost=host&wutNuPinned=1'

Deno.test('no op prompts inline: a prompt is only ever reached through a def', async () => {
  const inline: Array<string> = []
  for (const path of ASKING) {
    const body = await (await runSrv(req(`/sh/nu/${path}?${PARAMS}`))).text()
    if (GATE.test(topLevel(body))) {
      inline.push(path)
    }
  }
  assertEquals(inline, [])
})

Deno.test('every op that acts on the machine asks first', async () => {
  const silent: Array<string> = []
  for (const path of ASKING) {
    const body = await (await runSrv(req(`/sh/nu/${path}?${PARAMS}`))).text()
    if (!asks(body)) {
      silent.push(path)
    }
  }
  assertEquals(silent, [])
})

// find is the one that kept losing its prompt, and the one whose table has to come from the client's filter
Deno.test('each find asks through its own plan runner', async () => {
  const runners: Record<string, string> = {
    'pack/find/nu': 'packFindRun',
    'virt/find': 'virtFindRun',
    'script/find': 'scriptFindShow',
  }
  for (const [path, runner] of Object.entries(runners)) {
    const body = await (await runSrv(req(`/sh/nu/${path}?${PARAMS}`))).text()
    assertEquals([path, 'called', new RegExp(`^${runner}$`, 'm').test(body)], [path, 'called', true])
    assertEquals([path, 'asks', promptingDefs(body).has(runner)], [path, 'asks', true])
  }
})
