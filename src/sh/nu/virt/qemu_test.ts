import { assertEquals } from '@std/assert'

import { runNu } from '../../../_test.ts'

const QEMU_NU = new URL('./qemu.nu', import.meta.url).pathname

type HostCpu = { cpu: number; socket: number; siblings: string; capacity?: number }
type HostCpus = { sockets: number; cores: number; threads: number; pin: Array<number>; host: string }

// a sysfs tree holding only what virtQemuHostCores reads; `coreType` is intel hybrid's list of performance cores
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
    host: '',
  })
})

Deno.test('nu / qemu / host cpus: smt turned off leaves one thread per core', async () => {
  const cpus = Array.from({ length: 8 }, (_, c) => ({ cpu: c, socket: 0, siblings: `${c}`, capacity: 1024 }))
  const out = await hostCpus(cpus, '0-7')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 8, threads: 1, pin: [0, 1, 2, 3, 4, 5, 6, 7], host: '' })
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
    host: '16-23',
  })
})

Deno.test('nu / qemu / host cpus: intel hybrid without smt, performance cores split around the efficiency ones', async () => {
  const cpus = Array.from({ length: 16 }, (_, c) => ({ cpu: c, socket: 0, siblings: `${c}`, capacity: 1024 }))
  const out = await hostCpus(cpus, '0-15', '0-3,8-11')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 8, threads: 1, pin: [0, 1, 2, 3, 8, 9, 10, 11], host: '4-7,12-15' })
})

Deno.test('nu / qemu / host cpus: amd dense cores drop out by capacity', async () => {
  // ryzen ai 9 hx 370: 4 zen 5 cores, a hair apart, then 8 zen 5c, siblings 12 apart
  const zen5 = smtCores(0, 4, 12, 1024).map((c) => c.cpu % 12 === 0 ? c : { ...c, capacity: 1004 })
  const zen5c = smtCores(4, 8, 12, 660)
  const out = await hostCpus([...zen5, ...zen5c], '0-23')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 4, threads: 2, pin: [0, 12, 1, 13, 2, 14, 3, 15], host: '4-11,16-23' })
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
  assertEquals(out, { sockets: 2, cores: 2, threads: 2, pin: [0, 4, 1, 5, 2, 6, 3, 7], host: '' })
})

Deno.test('nu / qemu / host cpus: a kernel without cpu_capacity counts every cpu', async () => {
  const cpus = smtCores(0, 4, 4, 0).map(({ capacity: _, ...c }) => c)
  const out = await hostCpus(cpus, '0-7')
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 4, threads: 2, pin: [0, 4, 1, 5, 2, 6, 3, 7], host: '' })
})

type Topo = { online: Array<number>; sockets: Array<Array<Array<number>>> }
type Claim = HostCpus | { error: string }

// claiming needs no sysfs: the topology virtQemuHostCores would read is handed over as it is
async function claim(topo: Topo, reserve: number, want?: number, reverse = false): Promise<Claim | null> {
  const body = [
    await Deno.readTextFile(QEMU_NU),
    `let topo = (r#'${JSON.stringify(topo)}'# | from json)`,
    `print (virtQemuClaim $topo ${reserve} ${want ?? ''} ${reverse ? '--reverse' : ''} | to json --raw)`,
  ].join('\n')
  const out = await runNu(body)
  return out == null ? null : JSON.parse(out)
}

// ryzen 7 5700g: eight cores, cpu n and n+8 siblings
const R5700G: Topo = {
  online: Array.from({ length: 16 }, (_, c) => c),
  sockets: [Array.from({ length: 8 }, (_, c) => [c, c + 8])],
}

const coresOf = (...cores: Array<number>) => cores.flatMap((c) => [c, c + 8])

Deno.test('nu / qemu / claim: the reserve keeps the host its first cores whole', async () => {
  const out = await claim(R5700G, 2, 6)
  if (out == null) {
    return
  }
  assertEquals(out, {
    sockets: 1,
    cores: 6,
    threads: 2,
    pin: coresOf(2, 3, 4, 5, 6, 7),
    host: '0-1,8-9',
  })
})

Deno.test('nu / qemu / claim: unset takes the whole pool', async () => {
  const out = await claim(R5700G, 2)
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 6, threads: 2, pin: coresOf(2, 3, 4, 5, 6, 7), host: '0-1,8-9' })
})

Deno.test('nu / qemu / claim: fewer than the pool takes its first cores', async () => {
  const out = await claim(R5700G, 2, 4)
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 4, threads: 2, pin: coresOf(2, 3, 4, 5), host: '0-1,8-9' })
})

Deno.test('nu / qemu / claim: reverse takes the top cores, clear of one from the start', async () => {
  const out = await claim(R5700G, 2, 2, true)
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 2, threads: 2, pin: coresOf(6, 7), host: '0-1,8-9' })
})

Deno.test('nu / qemu / claim: wanting more than the pool fails', async () => {
  const out = await claim(R5700G, 2, 7)
  if (out == null) {
    return
  }
  assertEquals(out, { error: 'wants 7 cores, the pool has 6' })
})

Deno.test('nu / qemu / claim: a reserve that leaves no pool fails', async () => {
  const out = await claim(R5700G, 8)
  if (out == null) {
    return
  }
  assertEquals(out, { error: 'no cores outside the reserve' })
})

Deno.test('nu / qemu / claim: cores count per socket, the reserve too', async () => {
  // two sockets of two cores, siblings 4 apart
  const topo: Topo = { online: [0, 1, 2, 3, 4, 5, 6, 7], sockets: [[[0, 4], [1, 5]], [[2, 6], [3, 7]]] }
  const out = await claim(topo, 1)
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 2, cores: 1, threads: 2, pin: [1, 5, 3, 7], host: '0,2,4,6' })
})

Deno.test("nu / qemu / claim: efficiency cores are never in the pool, so they are the host's", async () => {
  // four p-cores with adjacent siblings, then four e-cores
  const topo: Topo = { online: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], sockets: [[[0, 1], [2, 3], [4, 5], [6, 7]]] }
  const out = await claim(topo, 1)
  if (out == null) {
    return
  }
  assertEquals(out, { sockets: 1, cores: 3, threads: 2, pin: [2, 3, 4, 5, 6, 7], host: '0-1,8-11' })
})

// the client's half of the fit check: what the server says each config wants, against the cores this host has
async function misfits(reserve: number, wants: Record<string, number>): Promise<Array<string> | null> {
  const out = await runNu([
    await Deno.readTextFile(QEMU_NU),
    `let topo = (r#'${JSON.stringify(R5700G)}'# | from json)`,
    `print (virtQemuMisfits $topo ${reserve} (r#'${JSON.stringify(wants)}'# | from json) | to json --raw)`,
  ].join('\n'))
  return out == null ? null : JSON.parse(out)
}

Deno.test('nu / qemu / misfits: configs that fit the pool, sharing it, block nothing', async () => {
  assertEquals(await misfits(2, { glass: 6, shard: 6 }) ?? [], [])
})

Deno.test('nu / qemu / misfits: a config wanting more than the pool is named', async () => {
  const out = await misfits(3, { glass: 6, 'glass/vga': 4 })
  if (out == null) {
    return
  }
  assertEquals(out, ['glass wants 6 cores, 5 available'])
})

Deno.test('nu / qemu / misfits: a reserve taking every core blocks on its own', async () => {
  const out = await misfits(8, {})
  if (out == null) {
    return
  }
  assertEquals(out, ['cpu.reserve.cores 8 takes all 8 cores'])
})

// the bug this covers: `^swtpm.*glass` and `^qemu-system.*glass` took any process whose command line held glass, so
// starting glass killed glass2's tpm, and glass read as running while only glass2 was. the patterns are put to grep -E,
// the extended regex pgrep and pkill compile them as
Deno.test('nu / qemu / match: an instance finds its own qemu and swtpm, never another whose name it starts', async () => {
  const out = await runNu([
    await Deno.readTextFile(QEMU_NU),
    'print (virtQemuMatch glass)',
    'print (virtSwtpmMatch glass)',
  ].join('\n'))
  if (out == null) {
    return
  }
  const [qemu, swtpm] = out.trim().split('\n')
  const lines = [
    'qemu-system-x86_64 -name glass,debug-threads=on -drive file=/var/lib/qemu/glass/os.img',
    'qemu-system-x86_64 -name glass2,debug-threads=on -drive file=/var/lib/qemu/glass2/os.img',
    'qemu-system-x86_64 -name shard,debug-threads=on -drive file=/mnt/glass/backup.img',
    'qemu-system-x86_64 -machine q35 -name guest=glass',
    'swtpm socket --ctrl type=unixio,path=/tmp/qemu/glass/tpm.socket --tpmstate dir=/tmp/qemu/glass',
    'swtpm socket --ctrl type=unixio,path=/tmp/qemu/glass2/tpm.socket --tpmstate dir=/tmp/qemu/glass2',
  ]
  const grep = async (pattern: string) => {
    const child = new Deno.Command('grep', { args: ['-E', pattern], stdin: 'piped', stdout: 'piped' }).spawn()
    const writer = child.stdin.getWriter()
    await writer.write(new TextEncoder().encode(lines.join('\n') + '\n'))
    await writer.close()
    return new TextDecoder().decode((await child.output()).stdout).trim().split('\n')
  }
  assertEquals(await grep(qemu), [lines[0], lines[3]])
  assertEquals(await grep(swtpm), [lines[4]])
})
