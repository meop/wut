import { assertEquals, assertRejects } from '@std/assert'

import { evaluateGate } from './gate.ts'
import { resolveHostGroupGates } from './host-groups.ts'

Deno.test('named host groups resolve once for file, map, script and pack gates without mutating config', async () => {
  const gate = { sys_host_group: ['dev'], sys_os_plat: ['linux'] }
  const input = {
    files: { agent: { gate, maps: [{ in: 'private', gate }] } },
    scripts: { agent: { setup: { nu: gate } } },
    pack: { operation: { add: { manager: { ghpm: { gate } } } } },
  }
  const before = structuredClone(input)
  let loads = 0
  const resolved = await resolveHostGroupGates(input, () => {
    loads++
    return Promise.resolve({ dev: ['stone', 'metal'] })
  })
  const expected = { sys_host: ['stone', 'metal'], sys_os_plat: ['linux'] }
  assertEquals<unknown>(resolved.files.agent.gate, expected)
  assertEquals<unknown>(resolved.files.agent.maps[0].gate, expected)
  assertEquals<unknown>(resolved.scripts.agent.setup.nu, expected)
  assertEquals<unknown>(resolved.pack.operation.add.manager.ghpm.gate, expected)
  assertEquals<unknown>(input, before)
  assertEquals<unknown>(loads, 1)
  for (const sys_host of ['stone', 'metal', 'work', 'stone-work', undefined]) {
    assertEquals<unknown>(
      evaluateGate(resolved.files.agent.gate, {
        req_orig: 'http://x',
        req_path: '/',
        req_srch: '',
        sys_host,
        sys_os_plat: 'linux',
      }),
      sys_host === 'stone' || sys_host === 'metal',
    )
  }
})

Deno.test('host groups combine by union and explicit hostnames narrow the result', async () => {
  const load = () => Promise.resolve({ dev: ['stone', 'metal'], other: ['metal', 'glass'], empty: [] })
  assertEquals<unknown>(await resolveHostGroupGates({ sys_host_group: ['dev', 'other'] }, load), {
    sys_host: ['stone', 'metal', 'glass'],
  })
  assertEquals<unknown>(await resolveHostGroupGates({ sys_host_group: ['dev'], sys_host: ['metal', 'glass'] }, load), {
    sys_host: ['metal'],
  })
  assertEquals<unknown>(await resolveHostGroupGates({ sys_host_group: ['empty'] }, load), { sys_host: [] })
})

Deno.test('group definitions are read afresh when another configuration is resolved', async () => {
  const hosts = ['stone']
  const load = () => Promise.resolve({ dev: hosts })
  const gate = { sys_host_group: ['dev'] }
  assertEquals<unknown>(await resolveHostGroupGates(gate, load), { sys_host: ['stone'] })
  hosts.push('metal')
  assertEquals<unknown>(await resolveHostGroupGates(gate, load), { sys_host: ['stone', 'metal'] })
})

Deno.test('configs without host group references do not require host.yaml', async () => {
  const input = { gate: { sys_host: ['stone'] }, flag: true, value: null, list: [1, 'x'] }
  assertEquals<unknown>(
    await resolveHostGroupGates(input, () => {
      throw new Error('must not load')
    }),
    input,
  )
})

Deno.test('unknown or malformed host groups report configuration errors', async () => {
  const gate = { sys_host_group: ['dev'] }
  await assertRejects(() => resolveHostGroupGates(gate, () => Promise.resolve({})), Error, 'unknown host group: dev')
  await assertRejects(
    () => resolveHostGroupGates({ sys_host_group: ['toString'] }, () => Promise.resolve({})),
    Error,
    'unknown host group',
  )
  for (const catalog of [null, [], { dev: 'stone' }, { dev: [1] }, { dev: [''] }]) {
    await assertRejects(() => resolveHostGroupGates(gate, () => Promise.resolve(catalog)), Error)
  }
  await assertRejects(
    () => resolveHostGroupGates({ sys_host_group: 'dev' }, () => Promise.resolve({ dev: ['stone'] })),
    Error,
    'must be a list',
  )
  await assertRejects(
    () => resolveHostGroupGates({ ...gate, sys_host: 'stone' }, () => Promise.resolve({ dev: ['stone'] })),
    Error,
    'must be a list',
  )
})
