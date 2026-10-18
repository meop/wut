import { stripVTControlCharacters } from 'node:util'

import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const VIRT_NU = new URL('./virt.nu', import.meta.url).pathname
const SEL_NU = new URL('./sel.nu', import.meta.url).pathname
const MATCH_NU = new URL('./match.nu', import.meta.url).pathname

// a root holding only the file each manager's add leaves behind, which is all the added check reads
async function withAdded(files: Array<string>, probe: (root: string) => string): Promise<string | null> {
  const root = await Deno.makeTempDir()
  try {
    for (const file of files) {
      const path = `${root}/${file}`
      await Deno.mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true })
      await Deno.writeTextFile(path, '')
    }
    return await runNu([await Deno.readTextFile(VIRT_NU), probe(root)].join('\n'))
  } finally {
    await Deno.remove(root, { recursive: true })
  }
}

const ADDED = [
  'etc/systemd/system/qemu-glass.service',
  'etc/containers/systemd/cave.kube',
  'var/lib/lxc/alma/config',
]

Deno.test('virt.nu - a rem or sync plan keeps only the instances that were added here', async () => {
  const out = await withAdded(ADDED, (root) =>
    `print (virtPlanAdded [
      {manager: lxc, instances: [alma kali]}
      {manager: podman, instances: ['cave/immich' 'cave/swag' 'home/smbd']}
      {manager: qemu, instances: [glass shard]}
    ] '${root}' | each { |e| $"($e.manager)=($e.instances | str join ',')" } | str join ' ')`)
  if (out != null) {
    assertEquals(out, 'lxc=alma podman=cave/immich,cave/swag qemu=glass')
  }
})

Deno.test('virt.nu - a manager with nothing added leaves the plan, and a variant counts as its instance', async () => {
  const out = await withAdded(ADDED, (root) =>
    `print (virtPlanAdded [
      {manager: lxc, instances: [kali void]}
      {manager: qemu, instances: ['glass/vfio' 'shard/blk-1q-1iot']}
    ] '${root}' | each { |e| $"($e.manager)=($e.instances | str join ',')" } | str join ' ')`)
  if (out != null) {
    assertEquals(out, 'qemu=glass/vfio')
  }
})

// docker leaves no file behind, so the daemon is asked: sudo and docker are stubs on a PATH of their own, and the
// listing is compose's, verbatim
Deno.test('virt.nu - a docker instance is added when the daemon holds its compose project, running or not', async () => {
  const dir = await Deno.makeTempDir()
  try {
    await Deno.writeTextFile(`${dir}/sudo`, '#!/bin/sh\nexec "$@"\n')
    await Deno.writeTextFile(
      `${dir}/docker`,
      `#!/bin/sh
case "$*" in
  "compose ls --all --format json") printf '%s' '[{"Name":"svc","Status":"running(2)","ConfigFiles":"-"},{"Name":"web","Status":"exited(1)","ConfigFiles":"-"}]' ;;
  *) exit 1 ;;
esac
`,
    )
    await Deno.chmod(`${dir}/sudo`, 0o755)
    await Deno.chmod(`${dir}/docker`, 0o755)
    const out = await runNu([
      await Deno.readTextFile(VIRT_NU),
      `$env.PATH = ['${dir}']`,
      `print (virtPlanAdded [{manager: docker, instances: [app svc web]}] | get instances | flatten | str join ',')`,
    ].join('\n'))
    if (out != null) {
      assertEquals(out, 'svc,web')
    }
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

// list with a term: lxc-ls and docker's compose listing are stubs, verbatim, behind a sudo that only passes through.
// the manager call is a stub too, since what it is handed is the thing under test
async function withListed(plan: Record<string, Array<string>>, pick: Array<number>): Promise<string | null> {
  const dir = await Deno.makeTempDir()
  try {
    const stubs: Record<string, string> = {
      sudo: 'exec "$@"',
      'lxc-ls': `printf '%s\\n' 'alma        kali        web-proxy'`,
      docker: `case "$*" in
  "compose ls --all --format json") printf '%s' '[{"Name":"web-app","Status":"running(2)","ConfigFiles":"-"},{"Name":"db","Status":"running(1)","ConfigFiles":"-"}]' ;;
  *) exit 1 ;;
esac`,
    }
    for (const [name, body] of Object.entries(stubs)) {
      await Deno.writeTextFile(`${dir}/${name}`, `#!/bin/sh\n${body}\n`)
      await Deno.chmod(`${dir}/${name}`, 0o755)
    }
    const out = await runNu([
      await getScriptFlavorOpPreamble('nu'),
      await Deno.readTextFile(MATCH_NU),
      (await Deno.readTextFile(SEL_NU)).replace(
        /^def wutSelectRead [\s\S]*?^}$/m,
        `def wutSelectRead [max: int] { ${JSON.stringify(pick).replaceAll(',', ' ')} }`,
      ),
      (await Deno.readTextFile(VIRT_NU)).replace(
        /^def --env virtCallManager [\s\S]*?^}$/m,
        `def --env virtCallManager [manager: string] { print $"-> ($manager) ($env.VIRT_INSTANCES | str join ' ')" }`,
      ),
      `$env.GRAYSCALE = '1'`,
      `$env.PATH = ['${dir}']`,
      `$env.VIRT_OP = 'list'`,
      `$env.VIRT_PLAN = '${JSON.stringify(plan)}'`,
      'virtPlanRun',
    ].join('\n'))
    return out == null ? null : stripVTControlCharacters(out)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
}

// the bug this covers: `wut v l web` made a row of web under every manager, before asking any of them, which read as
// each holding an instance called web. qemu is not on this PATH, so it is not asked at all
Deno.test('virt.nu - list with a term shows what each manager has that matches, and a row per manager', async () => {
  const out = await withListed({ docker: ['web'], lxc: ['web'], qemu: ['web'] }, [2])
  if (out != null) {
    const [summary, after] = out.split('2) lxc')
    assertEquals(summary.includes('docker\n  web-app\nlxc\n  web-proxy\n'), true)
    assertEquals(summary.includes('  web\n'), false)
    assertEquals(summary.includes('qemu'), false)
    // the summary lists the matches; the table is only the choice
    assertEquals(summary.includes('manager\n-------\n1) docker'), true)
    assertEquals(after.trim().endsWith('-> lxc web'), true)
  }
})

// picking a row used to hand a manager one term of several, so `wut v l web proxy` picked on its web row listed every
// web instance. a manager is a row now, and is handed every term
Deno.test('virt.nu - list with several terms matches a name against all of them, and hands them all on', async () => {
  const out = await withListed({ docker: ['web', 'proxy'], lxc: ['web', 'proxy'] }, [1])
  if (out != null) {
    assertEquals(out.includes('docker'), false)
    assertEquals(out.includes('lxc\n  web-proxy\n'), true)
    assertEquals(out.trim().endsWith('-> lxc web proxy'), true)
  }
})

Deno.test('virt.nu - list with a term nothing matches says so and asks nothing', async () => {
  const out = await withListed({ docker: ['zzz'], lxc: ['zzz'] }, [1])
  if (out != null) {
    assertEquals(out.includes('no instance matches: zzz'), true)
    assertEquals(out.includes('->'), false)
  }
})
