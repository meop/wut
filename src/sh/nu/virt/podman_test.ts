import { assertEquals } from '@std/assert'

import { runNu } from '../../../_test.ts'

const PODMAN_NU = new URL('./podman.nu', import.meta.url).pathname

// net0 as podman network inspect shows it, made before podman.yaml set dns: false
const NET0 = {
  name: 'net0',
  driver: 'bridge',
  network_interface: 'br0',
  ipv6_enabled: false,
  internal: false,
  dns_enabled: true,
  options: { mode: 'unmanaged' },
  ipam_options: { driver: 'dhcp' },
}

const NET0_DEF = { driver: 'bridge', interface: 'br0', ipam: 'dhcp', options: { mode: 'unmanaged' } }

async function drift(networkDef: object, inspected: object): Promise<Array<string> | null> {
  const out = await runNu([
    await Deno.readTextFile(PODMAN_NU),
    // as json, since runNu trims output
    `print (virtPodmanNetworkDrift ('${JSON.stringify(networkDef)}' | from json) ('${
      JSON.stringify(inspected)
    }' | from json) | to json --raw)`,
  ].join('\n'))
  return out == null ? null : JSON.parse(out)
}

Deno.test('podman.nu - a network that matches its definition has no drift', async () => {
  const out = await drift(NET0_DEF, NET0)
  if (out != null) {
    assertEquals(out, [])
  }
})

Deno.test('podman.nu - dns: false drifts from a network made with dns, and matches one made without', async () => {
  const out = await drift({ ...NET0_DEF, dns: false }, NET0)
  if (out != null) {
    assertEquals(out, ['dns'])
  }
  const made = await drift({ ...NET0_DEF, dns: false }, { ...NET0, dns_enabled: false })
  if (made != null) {
    assertEquals(made, [])
  }
})

Deno.test('podman.nu - dns is off on a macvlan whether or not the definition says so', async () => {
  const macvlan = { ...NET0, driver: 'macvlan', dns_enabled: false }
  const out = await drift({ ...NET0_DEF, driver: 'macvlan' }, macvlan)
  if (out != null) {
    assertEquals(out, [])
  }
})

Deno.test('podman.nu - options compare as podman holds them, strings, in any order', async () => {
  const inspected = { ...NET0, options: { mtu: '1500', mode: 'unmanaged' } }
  const out = await drift({ ...NET0_DEF, options: { mode: 'unmanaged', mtu: 1500 } }, inspected)
  if (out != null) {
    assertEquals(out, [])
  }
  const removed = await drift(NET0_DEF, inspected)
  if (removed != null) {
    assertEquals(removed, ['options'])
  }
})

Deno.test('podman.nu - interface and ipam are compared only when named, and an unnamed driver is a bridge', async () => {
  const out = await drift({ options: { mode: 'unmanaged' } }, NET0)
  if (out != null) {
    assertEquals(out, [])
  }
  const changed = await drift({ ...NET0_DEF, interface: 'br1', ipam: 'host-local' }, NET0)
  if (changed != null) {
    assertEquals(changed, ['interface', 'ipam'])
  }
})

Deno.test('podman.nu - network create takes --disable-dns only for dns: false', async () => {
  const args = async (networkDef: object) => {
    const out = await runNu([
      await Deno.readTextFile(PODMAN_NU),
      `print (virtPodmanNetworkArgs net0 ('${JSON.stringify(networkDef)}' | from json) | str join ' ')`,
    ].join('\n'))
    return out
  }
  const off = await args({ ...NET0_DEF, dns: false })
  if (off != null) {
    assertEquals(
      off,
      'network create --driver bridge --interface-name br0 --ipam-driver dhcp --disable-dns --opt mode=unmanaged net0',
    )
  }
  const on = await args(NET0_DEF)
  if (on != null) {
    assertEquals(on, 'network create --driver bridge --interface-name br0 --ipam-driver dhcp --opt mode=unmanaged net0')
  }
})
