import { stripVTControlCharacters } from 'node:util'

import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const SEL_NU = new URL('./sel.nu', import.meta.url).pathname

async function withSel(probe: string): Promise<string | null> {
  return await runNu([await getScriptFlavorOpPreamble('nu'), await Deno.readTextFile(SEL_NU), probe].join('\n'))
}

// what a typed answer picks: the prompt reads `[empty=all] (0=quit | 1[,][-]9)`, and anything it cannot read whole
// picks nothing, the way 0 does
Deno.test('nu / sel / an answer picks rows by number, by range, or all', async () => {
  const cases: Array<[string, number, Array<number> | null]> = [
    ['', 3, [1, 2, 3]],
    ['  ', 3, [1, 2, 3]],
    ['2', 3, [2]],
    ['3,1', 3, [1, 3]],
    ['1-3', 5, [1, 2, 3]],
    ['1, 4-5 2', 5, [1, 2, 4, 5]],
    ['2,2 1-2', 3, [1, 2]],
    ['0', 3, null],
    ['1,0', 3, null],
    ['0-2', 3, null],
    ['4', 3, null],
    ['2-4', 3, null],
    ['3-1', 3, null],
    ['1-2-3', 3, null],
    ['x', 3, null],
    ['1-x', 3, null],
  ]
  const out = await withSel(
    cases.map(([choice, max]) => `print (wutSelectParse '${choice}' ${max} | to json --raw)`).join('\n'),
  )
  if (out == null) {
    return
  }
  const got = out.split('\n').map((l) => JSON.parse(l))
  cases.forEach(([choice, max, expected], i) => assertEquals(got[i], expected, `'${choice}' of ${max}`))
})

// -y answers the picking too; with no terminal to answer from, nothing is picked rather than everything
Deno.test('nu / sel / -y picks every row, and no terminal picks none', async () => {
  const yes = await withSel(`$env.YES = '1'\nprint (wutSelectRead 3 | to json --raw)`)
  if (yes == null) {
    return
  }
  assertEquals(yes, '[1,2,3]')

  const script = await Deno.makeTempFile({ suffix: '.nu' })
  try {
    await Deno.writeTextFile(
      script,
      [
        await getScriptFlavorOpPreamble('nu'),
        await Deno.readTextFile(SEL_NU),
        'print (wutSelectRead 3 | to json --raw)',
      ].join('\n'),
    )
    const result = await new Deno.Command('nu', {
      args: ['--no-config-file', script],
      env: { GRAYSCALE: '1' },
      stdin: 'null',
      stdout: 'piped',
    }).output()
    assertEquals(new TextDecoder().decode(result.stdout).trim().split('\n'), [
      'no terminal to choose from, so none; -y picks all',
      'null',
    ])
  } finally {
    await Deno.remove(script)
  }
})

Deno.test('nu / sel / a table pads to its widest cell and leaves out a column no row fills', async () => {
  const out = await withSel(
    `wutTable ['manager' 'group' 'note'] [['ghpm' '' 'vendored'] ['pacman' '' '']]`,
  )
  if (out == null) {
    return
  }
  assertEquals(out.split('\n').map((l) => stripVTControlCharacters(l)), [
    'manager note',
    '------- ----',
    'ghpm    vendored',
    'pacman',
  ])
})
