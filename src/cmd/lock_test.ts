import { assertEquals } from '@std/assert'

import { req } from '../_test.ts'
import { runSrv } from '../srv.ts'

const PIN = 'sysOsPlat=linux&wutNuPinned=1'
const PIN_ARCH = `${PIN}&sysOs=arch`
const PIN_HOST = `${PIN}&sysHost=host`

// an op that may change the machine runs inside the host lock's scope, named for what a run waiting on it is told; one
// that only reads runs outside it. pack info and outdated refresh each manager's index first, which writes it as an add
// does; virt run is a foreground session that claims nothing. see docs/OPS.md (One host lock)
const CASES: Array<[string, string | null]> = [
  [`/sh/nu/pack/add/firefox?${PIN_ARCH}`, 'pack add'],
  [`/sh/nu/pack/rem/firefox?${PIN_ARCH}`, 'pack remove'],
  [`/sh/nu/pack/sync?${PIN_ARCH}`, 'pack sync'],
  [`/sh/nu/pack/sync/nu?${PIN_ARCH}`, 'pack sync'],
  [`/sh/nu/pack/tidy?${PIN_ARCH}`, 'pack tidy'],
  [`/sh/nu/pack/find/firefox?${PIN_ARCH}`, null],
  [`/sh/nu/pack/info?${PIN_ARCH}`, 'pack info'],
  [`/sh/nu/pack/info/nu?${PIN_ARCH}`, 'pack info'],
  [`/sh/nu/pack/list?${PIN_ARCH}`, null],
  [`/sh/nu/pack/list/nu?${PIN_ARCH}`, null],
  [`/sh/nu/pack/outdated?${PIN_ARCH}`, 'pack outdated'],
  [`/sh/nu/pack/outdated/nu?${PIN_ARCH}`, 'pack outdated'],
  [`/sh/nu/virt/add/qemu?${PIN_HOST}`, 'virt add'],
  [`/sh/nu/virt/rem/qemu?${PIN_HOST}`, 'virt rem'],
  [`/sh/nu/virt/sync/qemu?${PIN_HOST}`, 'virt sync'],
  [`/sh/nu/virt/tidy?${PIN_HOST}`, 'virt tidy'],
  [`/sh/nu/virt/on/qemu?${PIN_HOST}`, 'virt on'],
  [`/sh/nu/virt/off/qemu?${PIN_HOST}`, 'virt off'],
  [`/sh/nu/virt/snap/qemu?${PIN_HOST}`, 'virt snap'],
  [`/sh/nu/virt/unsnap/qemu?${PIN_HOST}`, 'virt unsnap'],
  [`/sh/nu/virt/roll/qemu?${PIN_HOST}`, 'virt roll'],
  [`/sh/nu/virt/unroll/qemu?${PIN_HOST}`, 'virt unroll'],
  [`/sh/nu/virt/run/test?${PIN_HOST}`, null],
  [`/sh/nu/virt/list?${PIN_HOST}`, null],
  [`/sh/nu/virt/find?${PIN_HOST}`, null],
  [`/sh/nu/file/sync/zsh?${PIN}`, 'file sync'],
  [`/sh/nu/file/diff/zsh?${PIN}`, null],
  [`/sh/nu/file/find/zsh?${PIN}`, null],
  [`/sh/nu/file/list/zsh?${PIN}`, null],
  [`/sh/nu/script/exec/setup?${PIN}`, 'script exec'],
  [`/sh/nu/script/find?${PIN}`, null],
]

Deno.test('lock / an op that may change the machine runs in the host lock scope, a reading op outside it', async () => {
  const got: Array<[string, string | null]> = []
  for (const [path] of CASES) {
    const body = await (await runSrv(req(path))).text()
    const locks = [...body.matchAll(/^wutLockScope r#'([\w ]+)'# \{$/gm)].map((m) => m[1])
    got.push([path, locks.length ? locks.join(',') : null])
  }
  assertEquals(got, CASES)
})
