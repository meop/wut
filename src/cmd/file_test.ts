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
