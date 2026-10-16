import { assertEquals } from '@std/assert'

import { qemuWants, virtNameClashes } from './virt.ts'

// a merged qemu config as the client reads it: the architecture its environment names, and that one's cpu.cores
function qemu(cores?: number, arch = 'x86_64') {
  return {
    environment: [`vm_sys_arch=${arch}`],
    qemu: { architecture: { [arch]: { cpu: cores == null ? {} : { cores } } } },
  }
}

Deno.test('virt / qemu wants: each config by its own number, a variant only where it sets one', () => {
  assertEquals(
    qemuWants([
      ['glass', qemu(6)],
      ['glass/vfio', qemu(6)],
      ['glass/vga', qemu(4)],
      ['shard', qemu()],
      ['shard/big', qemu(7)],
    ]),
    { glass: 6, 'glass/vga': 4, 'shard/big': 7 },
  )
})

Deno.test('virt / qemu wants: cores are read under the architecture the config names', () => {
  const config = {
    ...qemu(2, 'aarch64'),
    qemu: { architecture: { aarch64: { cpu: { cores: 2 } }, x86_64: { cpu: { cores: 9 } } } },
  }
  assertEquals(qemuWants([['pi', config]]), { pi: 2 })
})

// the host's config as getCfgDirDump lists it: manager, instance, then a variant or a pod's container
const host = [
  ['limits'],
  ['lxc', 'alma'],
  ['lxc', 'arch'],
  ['podman', 'cave'],
  ['podman', 'cave', 'immich'],
  ['qemu', 'glass'],
  ['qemu', 'glass', 'vfio'],
]

Deno.test('virt / name clashes: none in a host whose names are its own', () => {
  assertEquals(virtNameClashes(host, 'stone'), [])
})

Deno.test("virt / name clashes: a manager's name, the host's, and a name two managers share", () => {
  assertEquals(
    virtNameClashes([...host, ['qemu', 'lxc'], ['lxc', 'Stone'], ['qemu', 'alma'], ['docker', 'cave']], 'stone'),
    [
      'alma is an instance of lxc and qemu',
      'cave is an instance of docker and podman',
      "lxc is a manager's name",
      "stone is this host's name",
    ],
  )
})

Deno.test("virt / name clashes: a variant or a pod's container is not an instance", () => {
  assertEquals(virtNameClashes([...host, ['qemu', 'glass', 'alma'], ['podman', 'cave', 'glass']], 'stone'), [])
})
