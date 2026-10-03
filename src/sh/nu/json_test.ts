import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'

const JSON_NU = new URL('./json.nu', import.meta.url).pathname

async function merge(text: string, wanted: string): Promise<string | null> {
  const body = [
    await Deno.readTextFile(JSON_NU),
    // as json, since runNu trims output
    `print (jsoncMerge ${JSON.stringify(text)} ${wanted} | to json)`,
  ].join('\n')
  const out = await runNu(body)
  return out == null ? null : JSON.parse(out)
}

Deno.test('nu / json / a merge keeps what it does not set', async () => {
  const text = [
    '// mine',
    '{',
    '  "theme": "One Dark", // keep me',
    '  /* block */',
    '  "size": 20,',
    '  "features": {',
    '    "a": true',
    '  },',
    '}',
    '',
  ].join('\n')
  const out = await merge(text, `{size: 13, features: {b: 'x'}, added: false}`)
  if (out == null) {
    return
  }
  assertEquals(
    out,
    [
      '// mine',
      '{',
      '  "theme": "One Dark", // keep me',
      '  /* block */',
      '  "size": 13,',
      '  "features": {',
      '    "a": true,',
      '    "b": "x"',
      '  },',
      '  "added": false,',
      '}',
      '',
    ].join('\n'),
  )
})

Deno.test('nu / json / a merge with nothing to do changes nothing', async () => {
  const text = '{\n  "size": 13 // mine\n}\n'
  const out = await merge(text, `{size: 13}`)
  if (out == null) {
    return
  }
  assertEquals(out, text)
})

Deno.test('nu / json / a member added after a commented line keeps the comment', async () => {
  const out = await merge('{\n  "x": 1 // c\n}\n', `{y: {z: 2}}`)
  if (out == null) {
    return
  }
  assertEquals(out, '{\n  "x": 1, // c\n  "y": {\n    "z": 2\n  }\n}\n')
})

Deno.test('nu / json / an empty file or object takes what is wanted', async () => {
  const empty = await merge('', `{a: {b: 1}}`)
  const braces = await merge('{}', `{a: 1}`)
  if (empty == null || braces == null) {
    return
  }
  assertEquals(empty, '{\n  "a": {\n    "b": 1\n  }\n}\n')
  assertEquals(braces, '{\n  "a": 1\n}')
})
