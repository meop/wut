import { assertEquals } from '@std/assert'

import { qemuWants } from './virt.ts'

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
