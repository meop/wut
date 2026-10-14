import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { join } from '@std/path'

import { getScriptFlavorOpPreamble } from '../../sh.ts'

const LOCK_NU = new URL('./lock.nu', import.meta.url).pathname

type Run = { code: number; stdout: string; stderr: string }

// a nu process of its own per run, each with the same WUT_HOME, since what is under test is two runs meeting
async function nuCmd(home: string, probe: string): Promise<Deno.Command> {
  const script = await Deno.makeTempFile({ dir: home, suffix: '.nu' })
  await Deno.writeTextFile(
    script,
    [await getScriptFlavorOpPreamble('nu'), await Deno.readTextFile(LOCK_NU), probe].join('\n'),
  )
  return new Deno.Command('nu', {
    args: ['--no-config-file', script],
    env: { WUT_HOME: home },
    stdout: 'piped',
    stderr: 'piped',
  })
}

async function nuRun(home: string, probe: string): Promise<Run | null> {
  let out: Deno.CommandOutput
  try {
    out = await (await nuCmd(home, probe)).output()
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return null
    }
    throw e
  }
  const text = new TextDecoder()
  return { code: out.code, stdout: text.decode(out.stdout).trim(), stderr: text.decode(out.stderr).trim() }
}

async function withHome(fn: (home: string) => Promise<void>) {
  const home = await Deno.makeTempDir()
  try {
    await fn(home)
  } finally {
    await Deno.remove(home, { recursive: true })
  }
}

const lockDir = (home: string, name: string) => join(home, 'lock', name)

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path)
    return true
  } catch {
    return false
  }
}

async function plantLock(home: string, name: string, stamp: string | null, age = 0) {
  const dir = lockDir(home, name)
  await Deno.mkdir(dir, { recursive: true })
  if (stamp != null) {
    await Deno.writeTextFile(join(dir, 'pid'), stamp)
  }
  if (age) {
    const then = new Date(Date.now() - age)
    await Deno.utime(dir, then, then)
  }
}

Deno.test('nu / lock / a run holds its lock while it runs and gives it back when it ends', async () => {
  await withHome(async (home) => {
    const r = await nuRun(
      home,
      `wutLockRun 'virt' { print $nu.pid (open (wutLockPath virt | path join pid)) }; print (wutLockPath virt | path exists)`,
    )
    if (r == null) {
      return
    }
    const [pid, stamp, after] = r.stdout.split('\n')
    assert(stamp.startsWith(`${pid} `) || stamp === pid, stamp)
    assertEquals(after, 'false')
  })
})

Deno.test('nu / lock / commands lock apart, and a run its holder started is already inside', async () => {
  await withHome(async (home) => {
    const r = await nuRun(
      home,
      `wutLockRun 'virt' { wutLockRun 'pack' { print pack }; wutLockRun 'virt' { print nested } }; print (ls ($env.WUT_HOME | path join lock) | length)`,
    )
    if (r == null) {
      return
    }
    assertEquals(r.stdout, 'pack\nnested\n0')
  })
})

Deno.test('nu / lock / a second run stops while the first holds it, and ctrl-c gives it back', async () => {
  if (Deno.build.os === 'windows') {
    return
  }
  await withHome(async (home) => {
    let first: Deno.ChildProcess
    try {
      first = (await nuCmd(home, `wutLockRun 'virt' { print held; sleep 20sec; print finished }`)).spawn()
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return
      }
      throw e
    }
    const reader = first.stdout.pipeThrough(new TextDecoderStream()).getReader()
    let seen = ''
    while (!seen.includes('held')) {
      const { value, done } = await reader.read()
      assert(!done, 'the first run ended before it held the lock')
      seen += value
    }

    const second = await nuRun(home, `wutLockRun 'virt' { print ran }`)
    assertEquals(second?.code, 1)
    assertEquals(second?.stdout, '')
    assertStringIncludes(second?.stderr ?? '', `wut virt is already running here as pid ${first.pid}`)
    assertEquals((await nuRun(home, `wutLockRun 'pack' { print ran }`))?.stdout, 'ran')

    first.kill('SIGINT')
    await first.status
    await reader.cancel()
    await first.stderr.cancel()
    assertEquals(await exists(lockDir(home, 'virt')), false)
  })
})

Deno.test('nu / lock / a lock whose holder is gone is taken over', async () => {
  await withHome(async (home) => {
    // a pid no process has, and a live pid that has started since: what a crash leaves, and a pid handed on
    for (const stamp of ['999999999 0', `${Deno.pid} 0`, 'not a stamp']) {
      await plantLock(home, 'virt', stamp)
      const r = await nuRun(home, `wutLockRun 'virt' { print ran }`)
      if (r == null) {
        return
      }
      assertEquals([r.code, r.stdout], [0, 'ran'], stamp)
      assertEquals(await exists(lockDir(home, 'virt')), false, stamp)
    }
  })
})

Deno.test('nu / lock / a lock never stamped is taken over once it is old', async () => {
  await withHome(async (home) => {
    await plantLock(home, 'pack', null, 60_000)
    const r = await nuRun(home, `wutLockRun 'pack' { print ran }`)
    if (r == null) {
      return
    }
    assertEquals([r.code, r.stdout], [0, 'ran'])
  })
})

Deno.test('nu / lock / an error in the run gives the lock back and is raised again', async () => {
  await withHome(async (home) => {
    const r = await nuRun(home, `wutLockRun 'file' { error make { msg: 'boom' } }`)
    if (r == null) {
      return
    }
    assertEquals(r.code, 1)
    assertStringIncludes(r.stderr, 'boom')
    assertEquals(await exists(lockDir(home, 'file')), false)
  })
})
