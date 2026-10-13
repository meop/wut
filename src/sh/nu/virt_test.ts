import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'

const VIRT_NU = new URL('./virt.nu', import.meta.url).pathname

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
