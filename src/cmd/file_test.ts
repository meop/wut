import { NuSh } from '@meop/shire/sh/nu'
import { assertEquals, assertThrows } from '@std/assert'

import { type FileConfig, fileDependencies, resolveFilePlan } from './file.ts'

const content: FileConfig = {
  shared: { shared: true, maps: [{ in: '../git/gitconfig', out: { linux: '{HOME}/shared' } }] },
  left: { requires: ['shared'] },
  right: { requires: ['shared'] },
  consumer: { requires: ['left', 'right'] },
}

Deno.test('file dependencies expand a diamond once in prerequisite order', () => {
  assertEquals(fileDependencies(content, 'consumer'), ['shared', 'left', 'right', 'consumer'])
})

Deno.test('file dependencies reject cycles and missing groups', () => {
  assertThrows(() => fileDependencies({ a: { requires: ['b'] }, b: { requires: ['a'] } }, 'a'), Error, 'cycle')
  assertThrows(() => fileDependencies({ a: { requires: ['missing'] } }, 'a'), Error, 'unknown file dependency')
})

Deno.test('dependency files belong to selected consumer and keep canonical source identity', async () => {
  const context = { req_orig: 'http://x', req_path: '/', req_srch: '', sys_os_plat: 'linux' }
  const plan = await resolveFilePlan(new NuSh(), context, content, 'consumer')
  assertEquals(plan.pairs, ['consumer|git/gitconfig|{HOME}/shared'])
  assertEquals(await resolveFilePlan(new NuSh(), context, content, 'consumer', false), {
    pairs: [],
    dirs: [],
    perms: [],
  })
})

Deno.test('file host gates apply to direct, dependency and pack plans', async () => {
  const gated: FileConfig = {
    ...structuredClone(content),
    consumer: { ...content.consumer, gate: { sys_host: ['stone', 'metal'] } },
  }
  const context = { req_orig: 'http://x', req_path: '/', req_srch: '', sys_os_plat: 'linux' }
  const empty = { pairs: [], dirs: [], perms: [] }
  for (const sys_host of [undefined, 'work', 'stone-work']) {
    assertEquals(await resolveFilePlan(new NuSh(), { ...context, sys_host }, gated, 'consumer'), empty)
    assertEquals(await resolveFilePlan(new NuSh(), { ...context, sys_host }, gated, 'consumer', false), empty)
  }
  for (const sys_host of ['stone', 'metal']) {
    assertEquals((await resolveFilePlan(new NuSh(), { ...context, sys_host }, gated, 'consumer')).pairs, [
      'consumer|git/gitconfig|{HOME}/shared',
    ])
  }
  gated.shared.gate = { sys_host: ['glass'] }
  assertEquals(await resolveFilePlan(new NuSh(), { ...context, sys_host: 'stone' }, gated, 'consumer'), empty)
  assertEquals(await resolveFilePlan(new NuSh(), { ...context, sys_host: 'stone' }, gated, 'shared'), empty)
})

Deno.test('a gated dependency also excludes its prerequisites', async () => {
  const gated: FileConfig = { ...content, left: { requires: ['shared'], gate: { sys_host: ['stone'] } } }
  const context = { req_orig: 'http://x', req_path: '/', req_srch: '', sys_os_plat: 'linux', sys_host: 'work' }
  assertEquals(await resolveFilePlan(new NuSh(), context, gated, 'left'), { pairs: [], dirs: [], perms: [] })
  assertEquals(fileDependencies(gated, 'left', true, context), [])
  assertEquals(fileDependencies(gated, 'consumer', true, context), ['shared', 'right', 'consumer'])
})

Deno.test('map host gates exclude private files, directory cleanup and permissions while retaining generic files', async () => {
  const gated = structuredClone(content)
  gated.shared.maps = [
    { in: '../git/gitconfig', out: { linux: '{HOME}/generic' } },
    {
      gate: { sys_host: ['stone', 'metal'] },
      in: '../git',
      out: { linux: '{HOME}/private' },
      permission: { user: { read: true, write: true } },
    },
  ]
  const context = { req_orig: 'http://x', req_path: '/', req_srch: '', sys_os_plat: 'linux' }
  for (const key of ['shared', 'consumer']) {
    for (const sys_host of [undefined, 'work', 'stone-work']) {
      assertEquals(await resolveFilePlan(new NuSh(), { ...context, sys_host }, gated, key), {
        pairs: [`${key}|git/gitconfig|{HOME}/generic`],
        dirs: [],
        perms: [],
      })
    }
    for (const sys_host of ['stone', 'metal']) {
      const plan = await resolveFilePlan(new NuSh(), { ...context, sys_host }, gated, key)
      assertEquals(plan.pairs, [
        `${key}|git/gitconfig|{HOME}/generic`,
        `${key}|git/gitconfig|{HOME}/private/gitconfig`,
      ])
      assertEquals(plan.dirs, [`${key}|{HOME}/private`])
      assertEquals(plan.perms.length > 0, true)
    }
  }
})
