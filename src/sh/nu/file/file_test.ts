import { assertEquals } from '@std/assert'

import { runNu } from '../../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../../sh.ts'

const FILE_NU = new URL('./file.nu', import.meta.url).pathname

// the bug this covers: picking one tool's files to sync still reset every tool's permissions, so picking zellij ran
// ssh's chmod too, and failed the run where ssh's files had never been synced. each tool is a stub on a PATH of its
// own, since being installed is all the pick and the gate read
Deno.test('nu / file / sync resets the permissions of the tools picked, and only those', async () => {
  const dir = await Deno.makeTempDir()
  try {
    for (const bin of ['ssh', 'zellij']) {
      await Deno.writeTextFile(`${dir}/${bin}`, '#!/bin/sh\n')
      await Deno.chmod(`${dir}/${bin}`, 0o755)
    }
    const out = await runNu([
      await getScriptFlavorOpPreamble('nu'),
      await Deno.readTextFile(FILE_NU),
      `$env.GRAYSCALE = '1'`,
      `$env.PATH = ['${dir}']`,
      `$env.FILE_OP = 'sync'`,
      '$env.FILE_SYNC_PATH_PAIRS = []',
      `$env.FILE_SYNC_PATH_PERMS = ['ssh|print perm-ssh' 'zellij|print perm-zellij']`,
      `$env.FILE_SYNC_TOOLS = ['zellij']`,
      'file',
    ].join('\n'))
    if (out != null) {
      assertEquals(out.includes('perm-zellij'), true)
      assertEquals(out.includes('perm-ssh'), false)
    }
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})
