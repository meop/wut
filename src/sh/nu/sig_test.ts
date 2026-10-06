import { assertEquals } from '@std/assert'
import { walk } from '@std/fs'

import { runNu } from '../../_test.ts'

const SIG_NU = new URL('./sig.nu', import.meta.url).pathname
const PACK_NU = new URL('./pack.nu', import.meta.url).pathname
const NU_DIR = new URL('.', import.meta.url).pathname

// what a catch is handed when the command it guarded ended this way
async function interrupted(cmd: string): Promise<string | null> {
  const body = [
    await Deno.readTextFile(SIG_NU),
    `print (try { ${cmd}; 'no error' } catch { |e| wutInterrupted $e })`,
  ].join('\n')
  return await runNu(body)
}

Deno.test('nu / sig / a command that died of SIGINT is an interrupt', async () => {
  const out = await interrupted(`^sh -c 'kill -INT $$'`)
  if (out != null) {
    assertEquals(out, 'true')
  }
})

Deno.test('nu / sig / a command that read the ctrl-c itself and exited 130 is an interrupt', async () => {
  const out = await interrupted(`^sh -c 'exit 130'`)
  if (out != null) {
    assertEquals(out, 'true')
  }
})

Deno.test('nu / sig / a nu -c whose command died of SIGINT is an interrupt', async () => {
  const out = await interrupted(`^$nu.current-exe --no-config-file -c "^sh -c 'kill -INT $$'"`)
  if (out != null) {
    assertEquals(out, 'true')
  }
})

Deno.test('nu / sig / a failure, or another signal, is not an interrupt', async () => {
  for (const cmd of [`^sh -c 'exit 1'`, `^sh -c 'kill -KILL $$'`, `^sh -c 'kill -TERM $$'`, `error make {msg: x}`]) {
    const out = await interrupted(cmd)
    if (out != null) {
      assertEquals(out, 'false', cmd)
    }
  }
})

Deno.test('nu / sig / a rethrown interrupt stops the run, anything else carries on', async () => {
  const body = [
    await Deno.readTextFile(SIG_NU),
    `for c in ['exit 1', 'exit 130', 'exit 2'] {`,
    `  try { ^sh -c $c } catch { |e| wutRethrowInterrupt $e; print $"carried on past ($c)" }`,
    `}`,
  ].join('\n')
  const out = await runNu(body, true)
  if (out != null) {
    assertEquals(out, 'carried on past exit 1')
  }
})

// the inner nu a manager runs in keeps the manager's own failure to itself, and hands up how a signal ended it
async function packTry(cmd: string): Promise<number | null> {
  const pack = await Deno.readTextFile(PACK_NU)
  const constLine = pack.split('\n').find((l) => l.startsWith('const PACK_TRY_CATCH = '))!
  const body = [
    constLine,
    `let r = (^$nu.current-exe --no-config-file -c $"try { ${cmd} } ($PACK_TRY_CATCH)" | complete)`,
    `print $r.exit_code`,
  ].join('\n')
  const out = await runNu(body)
  return out == null ? null : Number(out)
}

Deno.test('nu / sig / a manager that fails is kept inside its try', async () => {
  const code = await packTry(`^sh -c 'exit 3'`)
  if (code != null) {
    assertEquals(code, 0)
  }
})

Deno.test('nu / sig / a manager a signal ended is not kept inside its try', async () => {
  for (
    const [cmd, want] of [[`^sh -c 'kill -KILL $$'`, 247], [`^sh -c 'kill -INT $$'`, 254], [`^sh -c 'exit 130'`, 130]]
  ) {
    const code = await packTry(cmd as string)
    if (code != null) {
      assertEquals(code, want, cmd as string)
    }
  }
})

// the rule, held for every file: a catch hands its error to wutRethrowInterrupt (or to packMarkFailed, which does)
// before anything else, and no try goes without a catch, since a bare one swallows a ctrl-c the same way
Deno.test('nu / sig / every catch in wut nu rethrows an interrupt', async () => {
  const offenders: Array<string> = []
  for await (const f of walk(NU_DIR, { exts: ['.nu'] })) {
    const lines = (await Deno.readTextFile(f.path)).split('\n')
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith('#') || line.startsWith('const PACK_TRY_CATCH')) {
        return
      }
      const at = `${f.path.slice(NU_DIR.length)}:${i + 1}`
      const ahead = lines.slice(i, i + 4).join('\n')
      // cleanup that must survive a pending ctrl-c is `try { X } catch { X }`: the second attempt runs once it is caught
      const retry = /\btry \{ (.+) \} catch \{ (.+) \}/.exec(line)
      if (retry && retry[1] === retry[2]) {
        return
      }
      if (/\bcatch \{/.test(line) && !/wutRethrowInterrupt|packMarkFailed|\{ \|e\| \$e \}/.test(ahead)) {
        offenders.push(`${at} catch without wutRethrowInterrupt`)
      }
      // a one-line try must carry its catch; a multi-line one is checked where its catch is
      if (/\btry \{.*\}\s*$/.test(line) && !/\bcatch \{/.test(line) && !/'\{'/.test(line)) {
        offenders.push(`${at} try without catch`)
      }
    })
  }
  assertEquals(offenders, [])
})
