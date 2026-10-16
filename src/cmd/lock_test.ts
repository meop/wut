import { assertEquals } from '@std/assert'

import { req } from '../_test.ts'
import { runSrv } from '../srv.ts'

const PIN = 'sysOsPlat=linux&wutNuPinned=1'
const PIN_ARCH = `${PIN}&sysOs=arch`
const PIN_HOST = `${PIN}&sysHost=host`

// the ops that change the machine take their command's lock, and the ones that only read take none; virt run is a
// foreground session that claims nothing. see docs/OPS.md (One run of a command at a time)
const CASES: Array<[string, string | null]> = [
  [`/sh/nu/pack/add/firefox?${PIN_ARCH}`, 'pack'],
  [`/sh/nu/pack/rem/firefox?${PIN_ARCH}`, 'pack'],
  [`/sh/nu/pack/sync?${PIN_ARCH}`, 'pack'],
  [`/sh/nu/pack/sync/nu?${PIN_ARCH}`, 'pack'],
  [`/sh/nu/pack/tidy?${PIN_ARCH}`, 'pack'],
  [`/sh/nu/pack/find/firefox?${PIN_ARCH}`, null],
  [`/sh/nu/pack/info/nu?${PIN_ARCH}`, null],
  [`/sh/nu/pack/list?${PIN_ARCH}`, null],
  [`/sh/nu/pack/list/nu?${PIN_ARCH}`, null],
  [`/sh/nu/pack/outdated?${PIN_ARCH}`, null],
  [`/sh/nu/virt/add/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/rem/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/sync/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/tidy?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/on/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/off/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/snap/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/unsnap/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/roll/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/unroll/qemu?${PIN_HOST}`, 'virt'],
  [`/sh/nu/virt/run/test?${PIN_HOST}`, null],
  [`/sh/nu/virt/list?${PIN_HOST}`, null],
  [`/sh/nu/virt/find?${PIN_HOST}`, null],
  [`/sh/nu/file/sync/zsh?${PIN}`, 'file'],
  [`/sh/nu/file/diff/zsh?${PIN}`, null],
  [`/sh/nu/file/find/zsh?${PIN}`, null],
  [`/sh/nu/file/list/zsh?${PIN}`, null],
  [`/sh/nu/script/exec/setup?${PIN}`, 'script'],
  [`/sh/nu/script/find?${PIN}`, null],
]

Deno.test('lock / a mutating op runs under its command lock, a reading op under none', async () => {
  const got: Array<[string, string | null]> = []
  for (const [path] of CASES) {
    const body = await (await runSrv(req(path))).text()
    const locks = [...body.matchAll(/^wutLockRun r#'(\w+)'# \{$/gm)].map((m) => m[1])
    got.push([path, locks.length ? locks.join(',') : null])
  }
  assertEquals(got, CASES)
})
