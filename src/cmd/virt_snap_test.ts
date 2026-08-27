import { assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'

import { checkSyntax, req } from '../_test.ts'
import { runSrv } from '../srv.ts'

// nu × linux (docker, lxc, podman, qemu)
Deno.test('nu / linux / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/tidy?sysOsPlat=linux'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × darwin (no managers on this plat)
Deno.test('nu / darwin / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / darwin / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/tidy?sysOsPlat=darwin'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × winnt (no managers on this plat)
Deno.test('nu / winnt / add', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / find', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / list', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / rem', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / sync', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / winnt / tidy', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/tidy?sysOsPlat=winnt'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux × host (with sysHost — exercises real instance config loading)
Deno.test('nu / linux / add (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / list (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / list (host podman)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/list/podman?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / rem (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / rem (host podman) — pinpoint', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem/podman?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
// qemu has two instances (test, test2): add is WIDE (both), rem is PINPOINT (first only)
Deno.test('nu / linux / add (host qemu) — wide', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/add/qemu?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / rem (host qemu) — pinpoint', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/rem/qemu?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / sync (host)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/sync?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// nu × linux × host × find with filter (exercises substring filter direction)
Deno.test('nu / linux / find (host test)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find/test?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})
Deno.test('nu / linux / find (host test2)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find/test2?sysOsPlat=linux&sysHost=host'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
})

// everything above stops at the redirect; these follow it to the body the client actually runs

const PIN = 'sysOsPlat=linux&sysHost=host&wutNuPinned=1'

Deno.test('nu / linux / find (pinned)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/find?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  // manager, then pod, then instance
  assertEquals(body.includes("opPrint r#'docker'#"), true)
  assertEquals(body.includes("opPrint r#'  svc'#"), true)
  assertEquals(body.includes("opPrint r#'podman'#"), true)
  assertEquals(body.includes("opPrint r#'  web'#"), true)
  assertEquals(body.includes("opPrint r#'    app, hub'#"), true)
  assertEquals(body.includes("opPrint r#'  test, test2'#"), true)
})
Deno.test('nu / linux / find (pinned, filtered)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/find/qemu?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("opPrint r#'qemu'#"), true)
  assertEquals(body.includes("opPrint r#'lxc'#"), false)
})
// add is WIDE: every qemu instance
Deno.test('nu / linux / add (pinned, qemu)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/qemu?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"qemu":["test","test2"]'), true)
  assertEquals(/^virtPlanRun$/m.test(body), true)
})
// rem is PINPOINT: one, even though the same filter matched two for add
Deno.test('nu / linux / rem (pinned, qemu)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/rem/qemu?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"qemu":["test"]'), true)
})
Deno.test('nu / linux / add (pinned, docker)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/docker?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"docker":["svc"]'), true)
})
// a variant folder is a way to configure an instance, not a second instance
Deno.test('nu / linux / run (pinned, qemu variant)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/run/vga?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"qemu":["test/vga"]'), true)
})
// add reaches a variant only when a filter names it
Deno.test('nu / linux / add (pinned, qemu variant named)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/test/vga?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"qemu":["test/vga"]'), true)
})
// and never fans out over them otherwise
Deno.test('nu / linux / add (pinned, instance does not fan out over variants)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/test?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('"qemu":["test","test2"]'), true)
})
// rem and sync act on the installed unit, which only carries the base name
Deno.test('nu / linux / rem (pinned, qemu variant is out of reach)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/rem/test/vga?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('no instance matched: test vga'), true)
})
// only qemu has a run arm, so a plan must not name another manager
Deno.test('nu / linux / run (pinned, podman is not runnable)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/run/app?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('no instance matched: app'), true)
  assertEquals(body.includes('def virtPodman'), false)
  assertEquals(body.includes('def virtQemu'), true)
})
Deno.test('nu / linux / list (pinned)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/list?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  for (const fn of ['virtDocker', 'virtLxc', 'virtPodman', 'virtQemu']) {
    assertEquals(body.includes(fn), true)
  }
})
// podman is the one manager with a networks config to hand over
Deno.test('nu / linux / add (pinned, podman carries networks)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/podman?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('VIRT_PODMAN_NETWORKS'), true)
})
// -m naming something this client cannot use: say so, do nothing
Deno.test('nu / linux / find (pinned, -m unsupported)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/-m/bogus/find?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('manager not supported: bogus'), true)
  assertEquals(/^virt[A-Z]/m.test(body), false)
})
// a filter that matched nothing is a no op, and says so rather than running silently
Deno.test('nu / linux / add (pinned, no match)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/nosuchthing?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('no instance matched: nosuchthing'), true)
  // the driver is always defined; nothing calls it
  assertEquals(/^virtPlanRun$/m.test(body), false)
})
// darwin supports no virt manager at all
Deno.test('nu / darwin / find (pinned, no managers)', async (t) => {
  const body = await (await runSrv(req('/sh/nu/virt/find?sysOsPlat=darwin&sysHost=host&wutNuPinned=1'))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes("opPrint r#'qemu'#"), false)
})

// virt plans like pack: which manager takes which instances, decided once
Deno.test('nu / linux / add (pinned, emits a plan for the client to run)', async (t) => {
  const body = await (await runSrv(req(`/sh/nu/virt/add/podman?${PIN}`))).text()
  await assertSnapshot(t, body)
  await checkSyntax('nu', body)
  assertEquals(body.includes('$env.VIRT_PLAN'), true)
  assertEquals(/^virtPlanRun$/m.test(body), true)
  // no per manager prompting left in the emission
  assertEquals(body.includes("input r#'use podman"), false)
})
