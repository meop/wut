import { assertEquals, assertStringIncludes } from '@std/assert'

import { runNu } from '../../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../../sh.ts'

const LOCK_NU = new URL('../lock.nu', import.meta.url).pathname
const FILE_NU = new URL('./file.nu', import.meta.url).pathname

// a config server of the sources given, and a home of its own, with each tool a stub on a PATH of its own, since being
// installed is all the gate reads. the run gets the op and its plan, and what it printed comes back with the home
async function withFiles(
  sources: Record<string, string>,
  setup: (home: string) => Promise<void>,
  lines: (home: string) => Array<string>,
  check: (out: string, home: string) => Promise<void>,
) {
  const home = await Deno.makeTempDir()
  const bin = await Deno.makeTempDir()
  const server = Deno.serve({ port: 0, onListen: () => {} }, (req) => {
    const path = decodeURIComponent(new URL(req.url).pathname.replace(/^\/file\//, ''))
    return path in sources ? new Response(sources[path]) : new Response('missing', { status: 404 })
  })
  try {
    for (const tool of ['ssh', 'zellij', 'claude']) {
      await Deno.writeTextFile(`${bin}/${tool}`, '#!/bin/sh\n')
      await Deno.chmod(`${bin}/${tool}`, 0o755)
    }
    await setup(home)
    const out = await runNu([
      await getScriptFlavorOpPreamble('nu'),
      await Deno.readTextFile(LOCK_NU),
      await Deno.readTextFile(FILE_NU),
      `$env.GRAYSCALE = '1'`,
      `$env.HOME = '${home}'`,
      `$env.PATH = ['${bin}' '/usr/bin' '/bin']`,
      `$env.REQ_URL_CFG = 'http://localhost:${server.addr.port}'`,
      ...lines(home),
      'file',
    ].join('\n'))
    if (out != null) {
      await check(out, home)
    }
  } finally {
    await server.shutdown()
    await Deno.remove(home, { recursive: true })
    await Deno.remove(bin, { recursive: true })
  }
}

const gone = async (path: string) => await Deno.stat(path).then(() => false, () => true)

const SOURCES = {
  'zellij/config.kdl': 'theme "a"\n',
  'zellij/cert.pem': 'cert\n',
  'claude/skills/hosts/SKILL.md': 'hosts\n',
  'ssh/config': 'Host *\n',
}
const plan = (op: string) => [
  `$env.FILE_OP = '${op}'`,
  `$env.FILE_${op.toUpperCase()}_PATH_PAIRS = [${
    [
      'zellij|zellij/config.kdl|{HOME}/z/config.kdl',
      'zellij|zellij/cert.pem|{HOME}/z/cert.pem',
      'claude|claude/skills/hosts/SKILL.md|{HOME}/c/hosts/SKILL.md',
      'ssh|ssh/config|{HOME}/s/config',
    ].map((p) => `'${p}'`).join(' ')
  }]`,
  `$env.FILE_${op.toUpperCase()}_DIRS = ['claude|{HOME}/c/hosts']`,
  `$env.FILE_${op.toUpperCase()}_PATH_PERMS = ['ssh|print perm-ssh' 'zellij|print perm-zellij' 'claude|print perm-claude']`,
]
// zellij's config is already what the source says, its cert is not there yet, and a file claude's folder map no longer
// has is still in place
const lived = async (home: string) => {
  await Deno.mkdir(`${home}/z`)
  await Deno.writeTextFile(`${home}/z/config.kdl`, 'theme "a"\n')
  await Deno.mkdir(`${home}/c/hosts`, { recursive: true })
  await Deno.writeTextFile(`${home}/c/hosts/SKILL.md`, 'old hosts\n')
  await Deno.writeTextFile(`${home}/c/hosts/gone.md`, 'gone\n')
}

// a sync writes only what differs from its source, takes out what a folder map no longer has, sets permissions only
// for a tool it wrote for, and acts only on the tools picked
Deno.test('nu / file / sync writes only what changed, and only for the tools picked', async () => {
  let before = 0
  await withFiles(
    SOURCES,
    async (home) => {
      await lived(home)
      before = (await Deno.stat(`${home}/z/config.kdl`)).mtime!.getTime()
    },
    () => [...plan('sync'), `$env.FILE_SYNC_TOOLS = ['zellij' 'claude']`],
    async (out, home) => {
      assertEquals(await Deno.readTextFile(`${home}/z/cert.pem`), 'cert\n', out)
      assertEquals((await Deno.stat(`${home}/z/config.kdl`)).mtime!.getTime(), before, out)
      assertEquals(await Deno.readTextFile(`${home}/c/hosts/SKILL.md`), 'hosts\n', out)
      assertEquals(await gone(`${home}/c/hosts/gone.md`), true, out)
      assertStringIncludes(out, 'zellij: 1 unchanged')
      assertStringIncludes(out, 'perm-zellij')
      assertStringIncludes(out, 'perm-claude')
      // ssh was not picked
      assertEquals(out.includes('perm-ssh'), false, out)
      assertEquals(await gone(`${home}/s/config`), true, out)
    },
  )
})

// a sync that would change nothing writes nothing, and sets no permissions
Deno.test('nu / file / a sync with nothing to change writes nothing', async () => {
  await withFiles(
    SOURCES,
    async (home) => {
      await Deno.mkdir(`${home}/z`)
      await Deno.writeTextFile(`${home}/z/config.kdl`, 'theme "a"\n')
      await Deno.writeTextFile(`${home}/z/cert.pem`, 'cert\n')
    },
    () => [...plan('sync'), `$env.FILE_SYNC_TOOLS = ['zellij']`],
    (out) => {
      assertStringIncludes(out, 'zellij: 2 unchanged')
      assertEquals(out.includes('save'), false, out)
      assertEquals(out.includes('perm-zellij'), false, out)
      return Promise.resolve()
    },
  )
})

// outdated says what a sync would do, with the diff of a changed file, and writes nothing
Deno.test('nu / file / outdated lists what a sync would write and changes nothing', async () => {
  await withFiles(
    SOURCES,
    lived,
    () => [...plan('outdated'), `$env.FILE_OUTDATED_TOOLS = ['zellij' 'claude']`],
    async (out, home) => {
      assertStringIncludes(out, `new: ${home}/z/cert.pem`)
      assertStringIncludes(out, `changed: ${home}/c/hosts/SKILL.md`)
      assertStringIncludes(out, '< old hosts')
      assertStringIncludes(out, `stale: ${home}/c/hosts/gone.md`)
      assertEquals(out.includes(`changed: ${home}/z/config.kdl`), false, out)
      assertEquals(await gone(`${home}/z/cert.pem`), true, out)
      assertEquals(await Deno.readTextFile(`${home}/c/hosts/gone.md`), 'gone\n')
    },
  )
})

// remove takes out a folder map's destination whole and each file written elsewhere, and leaves other tools' files
Deno.test('nu / file / remove takes out what a tool was written', async () => {
  await withFiles(
    SOURCES,
    async (home) => {
      await lived(home)
      await Deno.mkdir(`${home}/s`)
      await Deno.writeTextFile(`${home}/s/config`, 'Host *\n')
    },
    () => [...plan('remove'), `$env.FILE_REMOVE_TOOLS = ['zellij' 'claude']`],
    async (out, home) => {
      assertEquals(await gone(`${home}/c/hosts`), true, out)
      assertEquals(await gone(`${home}/z/config.kdl`), true, out)
      assertEquals(await Deno.readTextFile(`${home}/s/config`), 'Host *\n', out)
    },
  )
})

// list is what is in place here: each file of a tool here that is on disk
Deno.test('nu / file / list shows the files in place', async () => {
  await withFiles(
    SOURCES,
    lived,
    () => plan('list'),
    (out, home) => {
      assertStringIncludes(out, `${home}/z/config.kdl`)
      assertStringIncludes(out, `${home}/c/hosts/SKILL.md`)
      assertEquals(out.includes(`${home}/z/cert.pem`), false, out)
      return Promise.resolve()
    },
  )
})
