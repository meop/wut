import { assertEquals } from '@std/assert'
import { walk } from '@std/fs'

import { runNu } from '../../_test.ts'

const PACK_NU = new URL('./pack.nu', import.meta.url).pathname
const NU_DIR = new URL('.', import.meta.url).pathname

// the exit code of the child nu a manager runs in, with pack's try around the manager
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

Deno.test('nu / catch / a manager that fails is kept inside its try', async () => {
  const code = await packTry(`^sh -c 'exit 3'`)
  if (code != null) {
    assertEquals(code, 0)
  }
})

Deno.test('nu / catch / a manager a signal or a ctrl-c ended is not kept inside its try', async () => {
  for (
    const [cmd, want] of [[`^sh -c 'kill -KILL $$'`, 247], [`^sh -c 'kill -INT $$'`, 254], [`^sh -c 'exit 130'`, 130]]
  ) {
    const code = await packTry(cmd as string)
    if (code != null) {
      assertEquals(code, want, cmd as string)
    }
  }
})

// every catch hands its error to opRethrowInterrupt (or packMarkFailed, which does) or keeps it for later, and every
// try has a catch — except the settle, `try { do { } }`, whose job is to swallow the one thing it catches
Deno.test('nu / catch / every catch in wut nu rethrows an interrupt', async () => {
  const offenders: Array<string> = []
  for await (const f of walk(NU_DIR, { exts: ['.nu'] })) {
    const lines = (await Deno.readTextFile(f.path)).split('\n')
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith('#') || line.startsWith('const PACK_TRY_CATCH')) {
        return
      }
      const at = `${f.path.slice(NU_DIR.length)}:${i + 1}`
      const ahead = lines.slice(i, i + 4).join('\n')
      if (/\bcatch \{/.test(line) && !/opRethrowInterrupt|packMarkFailed|\{ \|e\| \$e \}/.test(ahead)) {
        offenders.push(`${at} catch without opRethrowInterrupt`)
      }
      if (
        /\btry \{.*\}\s*$/.test(line) && !/\bcatch \{/.test(line) && !/'\{'/.test(line) &&
        !/try \{ do \{ \} \}/.test(line)
      ) {
        offenders.push(`${at} try without catch`)
      }
    })
  }
  assertEquals(offenders, [])
})
