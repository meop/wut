import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'

const PACK_NU = new URL('./pack.nu', import.meta.url).pathname

// `which` is the only thing these decisions read, so a PATH of stub binaries is the whole fixture
async function withManagers(present: Array<string>, probe: string): Promise<string | null> {
  const dir = await Deno.makeTempDir()
  try {
    for (const name of present) {
      const path = `${dir}/${name}`
      await Deno.writeTextFile(path, '#!/bin/sh\n')
      await Deno.chmod(path, 0o755)
    }
    const body = [
      await Deno.readTextFile(PACK_NU),
      `$env.PATH = ['${dir}']`,
      `$env.PACK_MANAGERS = ['ghpm', 'brew', 'paru', 'yay', 'pacman', 'apt']`,
      probe,
    ].join('\n')
    return await runNu(body)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
}

Deno.test('nu / pack / the pacman family is offered once, widest first', async () => {
  const cases: Array<[Array<string>, string]> = [
    [['paru', 'yay', 'pacman'], 'paru'],
    [['yay', 'pacman'], 'yay'],
    [['pacman'], 'pacman'],
  ]
  for (const [present, expected] of cases) {
    const out = await withManagers(present, 'print (packManagersHere | str join " ")')
    if (out == null) {
      return
    }
    assertEquals(out, expected)
  }
})

// which of the three a group declared only narrows what is acceptable: a pacman entry is a repo package any of
// them can install, a yay entry is from the AUR and bare pacman cannot
Deno.test('nu / pack / a declared manager widens to an aur helper, never narrows to pacman', async () => {
  const probe = `print ([paru yay pacman] | each { |m| (packManagerBest $m | default 'none') } | str join " ")`
  const withHelper = await withManagers(['yay', 'pacman'], probe)
  if (withHelper == null) {
    return
  }
  assertEquals(withHelper, 'yay yay yay')
  assertEquals(await withManagers(['pacman'], probe), 'none none pacman')
})
