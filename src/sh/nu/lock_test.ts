import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { join } from '@std/path'

import { getScriptFlavorOpPreamble } from '../../sh.ts'

const LOCK_NU = new URL('./lock.nu', import.meta.url).pathname

type Run = { code: number; stdout: string; stderr: string }

async function nuScript(home: string, probe: string): Promise<string> {
  const script = await Deno.makeTempFile({ dir: home, suffix: '.nu' })
  await Deno.writeTextFile(
    script,
    [await getScriptFlavorOpPreamble('nu'), await Deno.readTextFile(LOCK_NU), probe].join('\n'),
  )
  return script
}

// a nu process of its own per run, each with the same WUT_HOME, since what is under test is two runs meeting
async function nuCmd(home: string, probe: string, signal?: AbortSignal): Promise<Deno.Command> {
  return new Deno.Command('nu', {
    args: ['--no-config-file', await nuScript(home, probe)],
    env: { WUT_HOME: home },
    stdout: 'piped',
    stderr: 'piped',
    signal,
  })
}

// a run that should not wait is given a deadline, so one that waits on a lock it should hold fails rather than hangs
async function nuRun(home: string, probe: string, deadline = 30_000): Promise<Run | null> {
  let out: Deno.CommandOutput
  try {
    out = await (await nuCmd(home, probe, AbortSignal.timeout(deadline))).output()
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

const lockDir = (home: string) => join(home, 'lock', 'host')

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path)
    return true
  } catch {
    return false
  }
}

async function plantLock(home: string, stamp: string | null, age = 0) {
  const dir = lockDir(home)
  await Deno.mkdir(dir, { recursive: true })
  if (stamp != null) {
    await Deno.writeTextFile(join(dir, 'pid'), stamp)
  }
  if (age) {
    const then = new Date(Date.now() - age)
    await Deno.utime(dir, then, then)
  }
}

// reads the first run's stdout until it says it holds the lock, and answers with nu's own pid: a nu on PATH can be a
// shim that runs nu as its child
async function untilHeld(reader: ReadableStreamDefaultReader<string>): Promise<{ held: string; seen: string }> {
  let seen = ''
  while (!/held \d+\n/.test(seen)) {
    const { value, done } = await reader.read()
    assert(!done, 'the first run ended before it held the lock')
    seen += value
  }
  return { held: seen.match(/held (\d+)/)![1], seen }
}

Deno.test('nu / lock / a hold in a scope takes the lock, says what holds it, and the scope gives it back', async () => {
  await withHome(async (home) => {
    const r = await nuRun(
      home,
      [
        `wutLockScope 'pack sync' {`,
        `  wutLockHold`,
        `  print $nu.pid (open (wutLockPath | path join pid)) (open (wutLockPath | path join what))`,
        `}`,
        `print (wutLockPath | path exists)`,
      ].join('\n'),
    )
    if (r == null) {
      return
    }
    const [pid, stamp, what, after] = r.stdout.split('\n')
    assert(stamp.startsWith(`${pid} `) || stamp === pid, stamp)
    assertEquals([what, after], ['pack sync', 'false'])
  })
})

Deno.test('nu / lock / nothing is taken until a hold, and a hold outside a scope takes nothing', async () => {
  await withHome(async (home) => {
    const r = await nuRun(
      home,
      `wutLockHold; print (wutLockPath | path exists); wutLockScope 'pack list' { print (wutLockPath | path exists) }`,
    )
    if (r == null) {
      return
    }
    assertEquals(r.stdout, 'false\nfalse')
  })
})

Deno.test('nu / lock / a scope inside a scope holds the one lock, and only the outer one gives it back', async () => {
  await withHome(async (home) => {
    const r = await nuRun(
      home,
      [
        `wutLockScope 'pack add' {`,
        `  wutLockHold`,
        `  wutLockScope 'script exec' { wutLockHold; print (open (wutLockPath | path join what)) }`,
        `  print (wutLockPath | path exists)`,
        `}`,
        `print (wutLockPath | path exists)`,
      ].join('\n'),
    )
    if (r == null) {
      return
    }
    assertEquals(r.stdout, 'pack add\ntrue\nfalse')
  })
})

// a chained wut is a process of its own: handed the stamp, or started by sudo, su or a service that drops it
Deno.test('nu / lock / a run the holder started is inside its lock, with or without the environment', async () => {
  await withHome(async (home) => {
    const child = await nuScript(home, `wutLockScope 'script exec' { wutLockHold; print inside }`)
    const r = await nuRun(
      home,
      [
        `wutLockScope 'pack add' {`,
        `  wutLockHold`,
        `  ^$nu.current-exe --no-config-file '${child}'`,
        `  hide-env WUT_LOCK_HOST WUT_LOCK_SCOPE`,
        `  ^$nu.current-exe --no-config-file '${child}'`,
        `  print (open (wutLockPath | path join what))`,
        `}`,
        `print (wutLockPath | path exists)`,
      ].join('\n'),
      15_000,
    )
    if (r == null) {
      return
    }
    assertEquals(r.stdout, 'inside\ninside\npack add\nfalse', r.stderr)
  })
})

Deno.test('nu / lock / a second run waits while the first holds it, names it, and goes on once it ends', async () => {
  await withHome(async (home) => {
    let first: Deno.ChildProcess
    try {
      first = (await nuCmd(
        home,
        `wutLockScope 'pack sync' { wutLockHold; print $'held ($nu.pid)'; sleep 3sec; print finished }`,
      )).spawn()
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return
      }
      throw e
    }
    const reader = first.stdout.pipeThrough(new TextDecoderStream()).getReader()
    const { held } = await untilHeld(reader)

    const started = Date.now()
    const second = await nuRun(home, `wutLockScope 'virt add' { wutLockHold; print ran }`)
    const waited = Date.now() - started
    await first.status
    await reader.cancel()
    await first.stderr.cancel()

    assertEquals(second?.code, 0, second?.stderr)
    assertStringIncludes(second!.stdout + second!.stderr, `waiting for \`wut pack sync\` (pid ${held})`)
    assert(second!.stdout.endsWith('ran'), second!.stdout)
    assert(waited >= 1_000, `the second run went on after ${waited}ms, before the first gave the lock back`)
    assertEquals(await exists(lockDir(home)), false)
  })
})

Deno.test('nu / lock / a ctrl-c to the holder gives the lock back', async () => {
  if (Deno.build.os === 'windows') {
    return
  }
  await withHome(async (home) => {
    let first: Deno.ChildProcess
    try {
      first = (await nuCmd(
        home,
        `wutLockScope 'virt sync' { wutLockHold; print $'held ($nu.pid)'; sleep 20sec; print finished }`,
      )).spawn()
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return
      }
      throw e
    }
    const reader = first.stdout.pipeThrough(new TextDecoderStream()).getReader()
    let { held, seen } = await untilHeld(reader)
    assertEquals(await exists(lockDir(home)), true)

    Deno.kill(Number(held), 'SIGINT')
    await first.status
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      seen += r.value
    }
    assert(!seen.includes('finished'), 'the first run slept out its sleep rather than stop at ctrl-c')
    await reader.cancel()
    await first.stderr.cancel()
    assertEquals(await exists(lockDir(home)), false)
  })
})

Deno.test('nu / lock / a lock whose holder is gone is taken over', async () => {
  await withHome(async (home) => {
    // a pid no process has, and a live pid that has started since: what a crash leaves, and a pid handed on
    for (const stamp of ['999999999 0', `${Deno.pid} 0`, 'not a stamp']) {
      await plantLock(home, stamp)
      const r = await nuRun(home, `wutLockScope 'pack add' { wutLockHold; print ran }`)
      if (r == null) {
        return
      }
      assertEquals([r.code, r.stdout], [0, 'ran'], stamp)
      assertEquals(await exists(lockDir(home)), false, stamp)
    }
  })
})

Deno.test('nu / lock / a lock never stamped is taken over once it is old', async () => {
  await withHome(async (home) => {
    await plantLock(home, null, 60_000)
    const r = await nuRun(home, `wutLockScope 'pack add' { wutLockHold; print ran }`)
    if (r == null) {
      return
    }
    assertEquals([r.code, r.stdout], [0, 'ran'])
  })
})

Deno.test('nu / lock / an error in the run gives the lock back and is raised again', async () => {
  await withHome(async (home) => {
    const r = await nuRun(home, `wutLockScope 'file sync' { wutLockHold; error make { msg: 'boom' } }`)
    if (r == null) {
      return
    }
    assertEquals(r.code, 1)
    assertStringIncludes(r.stderr, 'boom')
    assertEquals(await exists(lockDir(home)), false)
  })
})
