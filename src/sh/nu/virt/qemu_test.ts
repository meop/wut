import { assertEquals } from '@std/assert'

import { runNu } from '../../../_test.ts'

const QEMU_NU = new URL('./qemu.nu', import.meta.url).pathname

type HostCpu = { cpu: number; socket: number; siblings: string; capacity?: number }
type HostCpus = { sockets: number; cores: number; threads: number; pin: Array<number> }

// a sysfs tree holding only what virtQemuHostCpus reads; `coreType` is intel hybrid's list of performance cores
async function hostCpus(cpus: Array<HostCpu>, online: string, coreType?: string): Promise<HostCpus | null> {
  const root = await Deno.makeTempDir()
  try {
    const cpuDir = `${root}/devices/system/cpu`
    await Deno.mkdir(cpuDir, { recursive: true })
    await Deno.writeTextFile(`${cpuDir}/online`, `${online}\n`)
    for (const c of cpus) {
      await Deno.mkdir(`${cpuDir}/cpu${c.cpu}/topology`, { recursive: true })
      await Deno.writeTextFile(`${cpuDir}/cpu${c.cpu}/topology/physical_package_id`, `${c.socket}\n`)
      await Deno.writeTextFile(`${cpuDir}/cpu${c.cpu}/topology/thread_siblings_list`, `${c.siblings}\n`)
      if (c.capacity != null) {
        await Deno.writeTextFile(`${cpuDir}/cpu${c.cpu}/cpu_capacity`, `${c.capacity}\n`)
      }
    }
    if (coreType != null) {
      await Deno.mkdir(`${root}/devices/cpu_core`, { recursive: true })
      await Deno.writeTextFile(`${root}/devices/cpu_core/cpus`, `${coreType}\n`)
    }
    const body = [
      await Deno.readTextFile(QEMU_NU),
      // as json, since runNu trims output
      `print (virtQemuHostCpus '${root}' | to json --raw)`,
    ].join('\n')
    const out = await runNu(body)
    return out == null ? null : JSON.parse(out)
  } finally {
    await Deno.remove(root, { recursive: true })
  }
}

// smt siblings `n` apart, the way amd and intel both number them: every core first, then every core's second thread
function smtCores(first: number, count: number, offset: number, capacity: number, socket = 0): Array<HostCpu> {
  return Array.from({ length: count }, (_, i) => first + i).flatMap((c) => [
    { cpu: c, socket, siblings: `${c},${c + offset}`, capacity },
    { cpu: c + offset, socket, siblings: `${c},${c + offset}`, capacity },
  ])
}

Deno.test('nu / qemu / host cpus: smt pairs each vcpu with its host sibling', async () => {
  // ryzen 7 5700g: cpu n and n+8 share a core
  const out = await hostCpus(smtCores(0, 8, 8, 1024), '0-15')
  if (out == null) {
    return
  }
  assertEquals(out, {
    sockets: 1,
    cores: 8,
    threads: 2,
    pin: [0, 8, 1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15],
  })
})

Deno.test('nu / qemu / host cpus: smt turned off leaves one thread per core', async () => {
  const cpus = Array.from({ length: 8 }, (_, c) => ({ cpu: c, socket: 0, siblings: `${c}`, capacity: 1024 }))
  const out = await hostCpus(cpus, '0-7')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 8, threads: 1, pin: [0, 1, 2, 3, 4, 5, 6, 7] })
})

Deno.test('nu / qemu / host cpus: intel hybrid keeps only the performance cores', async () => {
  // i9-12900k: 8 p-cores with adjacent smt siblings, then 8 e-cores; the cpu_core list wins over capacity
  const pCores = Array.from({ length: 8 }, (_, i) => 2 * i).flatMap((c) => [
    { cpu: c, socket: 0, siblings: `${c}-${c + 1}`, capacity: 1024 },
    { cpu: c + 1, socket: 0, siblings: `${c}-${c + 1}`, capacity: 1024 },
  ])
  const eCores = Array.from(
    { length: 8 },
    (_, i) => ({ cpu: 16 + i, socket: 0, siblings: `${16 + i}`, capacity: 1024 }),
  )
  const out = await hostCpus([...pCores, ...eCores], '0-23', '0-15')
  if (out == null) {
    return
  }
  assertEquals(out, {
    sockets: 1,
    cores: 8,
    threads: 2,
    pin: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  })
})

Deno.test('nu / qemu / host cpus: intel hybrid without smt, performance cores split around the efficiency ones', async () => {
  const cpus = Array.from({ length: 16 }, (_, c) => ({ cpu: c, socket: 0, siblings: `${c}`, capacity: 1024 }))
  const out = await hostCpus(cpus, '0-15', '0-3,8-11')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 8, threads: 1, pin: [0, 1, 2, 3, 8, 9, 10, 11] })
})

Deno.test('nu / qemu / host cpus: amd dense cores drop out by capacity', async () => {
  // ryzen ai 9 hx 370: 4 zen 5 cores, a hair apart, then 8 zen 5c, siblings 12 apart
  const zen5 = smtCores(0, 4, 12, 1024).map((c) => c.cpu % 12 === 0 ? c : { ...c, capacity: 1004 })
  const zen5c = smtCores(4, 8, 12, 660)
  const out = await hostCpus([...zen5, ...zen5c], '0-23')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 4, threads: 2, pin: [0, 12, 1, 13, 2, 14, 3, 15] })
})

Deno.test('nu / qemu / host cpus: sockets come before cores', async () => {
  // two sockets of two cores: cores numbered across sockets first, then their siblings
  const out = await hostCpus([
    { cpu: 0, socket: 0, siblings: '0,4' },
    { cpu: 1, socket: 0, siblings: '1,5' },
    { cpu: 2, socket: 1, siblings: '2,6' },
    { cpu: 3, socket: 1, siblings: '3,7' },
    { cpu: 4, socket: 0, siblings: '0,4' },
    { cpu: 5, socket: 0, siblings: '1,5' },
    { cpu: 6, socket: 1, siblings: '2,6' },
    { cpu: 7, socket: 1, siblings: '3,7' },
  ], '0-7')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 2, cores: 2, threads: 2, pin: [0, 4, 1, 5, 2, 6, 3, 7] })
})

Deno.test('nu / qemu / host cpus: a kernel without cpu_capacity counts every cpu', async () => {
  const cpus = smtCores(0, 4, 4, 0).map(({ capacity: _, ...c }) => c)
  const out = await hostCpus(cpus, '0-7')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 4, threads: 2, pin: [0, 4, 1, 5, 2, 6, 3, 7] })
})
