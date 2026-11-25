import { assertEquals, assertRejects } from '@std/assert'
import { join } from '@std/path'
import { stringify } from '@std/yaml'

import { ensureGeneratedSources } from './generate.ts'

async function fixture(run: (root: string) => Promise<void>) {
  const root = await Deno.makeTempDir()
  try {
    await run(root)
  } finally {
    await Deno.remove(root, { recursive: true })
  }
}

async function generator(root: string, code: string, outputs = ['file/tool/secret/password']) {
  await Deno.writeTextFile(
    join(root, 'generate.yaml'),
    stringify({
      tool: { outputs, command: [Deno.execPath(), 'eval', code] },
    }),
  )
}

Deno.test('generated sources are shared across concurrent requests and retain user edits', () =>
  fixture(async (root) => {
    const output = 'file/tool/secret/password'
    await generator(
      root,
      `
    await new Promise(r => setTimeout(r, 30))
    await Deno.mkdir('file/tool/secret', {recursive: true})
    await Deno.writeTextFile('${output}', crypto.randomUUID(), {createNew: true, mode: 0o600})
  `,
    )
    await Promise.all(
      Array.from({ length: 8 }, () => ensureGeneratedSources(root, ['file', 'tool', 'secret/password'])),
    )
    const first = await Deno.readTextFile(join(root, output))
    assertEquals(first.length, 36)
    await Deno.writeTextFile(join(root, output), 'user-edited')
    await ensureGeneratedSources(root, ['file', 'tool', 'secret'])
    assertEquals(await Deno.readTextFile(join(root, output)), 'user-edited')
  }))

Deno.test('unrelated config reads do not invoke generators', () =>
  fixture(async (root) => {
    await generator(root, 'Deno.exit(77)')
    await ensureGeneratedSources(root, ['pack', 'tool'])
    await ensureGeneratedSources(root, ['file', 'other', 'secret'])
  }))

Deno.test('generator failures discard output text and permit a retry', () =>
  fixture(async (root) => {
    await generator(root, `console.error('private-value'); Deno.exit(4)`)
    const error = await assertRejects(
      () => ensureGeneratedSources(root, ['file', 'tool', 'secret']),
      Error,
      'exit 4',
    )
    assertEquals(error.message.includes('private-value'), false)
    await generator(
      root,
      `
    await Deno.mkdir('file/tool/secret', {recursive: true})
    await Deno.writeTextFile('file/tool/secret/password', 'created')
  `,
    )
    await ensureGeneratedSources(root, ['file', 'tool', 'secret'])
    assertEquals(await Deno.readTextFile(join(root, 'file/tool/secret/password')), 'created')
  }))

Deno.test('generators must declare private source paths and create their outputs', () =>
  fixture(async (root) => {
    await generator(root, '', ['../outside'])
    await assertRejects(() => ensureGeneratedSources(root, ['file', 'tool']), Error, 'invalid source generator')
    await generator(root, 'Deno.exit(0)')
    await assertRejects(() => ensureGeneratedSources(root, ['file', 'tool']), Error, 'did not create')
  }))
