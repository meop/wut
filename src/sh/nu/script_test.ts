import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const SCRIPT_NU = new URL('./script.nu', import.meta.url).pathname

// a plan the way the server writes one; sh is on every PATH these tests run on, and the other command on none
async function withPlan(units: Array<Record<string, unknown>>, probe: string) {
  return await runNu([
    await getScriptFlavorOpPreamble('nu'),
    await Deno.readTextFile(SCRIPT_NU),
    `$env.SCRIPT_PLAN = r#'${JSON.stringify(units)}'#`,
    probe,
  ].join('\n'))
}

const unit = (
  tool: string,
  action: string,
  cmds: Array<string> = [],
  noCmds: Array<string> = [],
  svcs: Array<string> = [],
  noSvcs: Array<string> = [],
) => ({ id: `${tool}/${action}`, action, tool, shell: 'zsh', cmds, noCmds, svcs, noSvcs })

Deno.test('script.nu - has_cmd needs one of its commands, no_cmd needs none of them', async () => {
  const out = await withPlan(
    [
      unit('ungated', 'setup'),
      unit('tool-here', 'setup', ['sh']),
      unit('tool-missing', 'setup', ['wut-no-such-cmd']),
      unit('either-here', 'setup', ['wut-no-such-cmd', 'sh']),
      unit('not-installed-yet', 'install', [], ['wut-no-such-cmd']),
      unit('already-installed', 'install', [], ['sh']),
    ],
    `print (scriptPlanHere | get tool | str join ',')`,
  )
  if (out != null) {
    assertEquals(out, 'ungated,tool-here,either-here,not-installed-yet')
  }
})

// a linux service is known by its systemd unit file, and journald has one wherever systemd runs
const JOURNALD = '/usr/lib/systemd/system/systemd-journald.service'

Deno.test({
  name: 'script.nu - has_svc needs one of its services, no_svc needs none of them',
  ignore: Deno.build.os !== 'linux' || !(await Deno.stat(JOURNALD).then(() => true, () => false)),
  fn: async () => {
    const out = await withPlan(
      [
        unit('svc-here', 'setup', [], [], ['systemd-journald']),
        unit('svc-missing', 'setup', [], [], ['wut-no-such-svc']),
        unit('feature-not-yet', 'install', [], [], [], ['wut-no-such-svc']),
        unit('feature-in', 'install', [], [], [], ['systemd-journald']),
      ],
      `print (scriptPlanHere | get tool | str join ',')`,
    )
    if (out != null) {
      assertEquals(out, 'svc-here,feature-not-yet')
    }
  },
})

Deno.test('script.nu - the listing shows what applies, then what the gates rule out, grouped the same way', async () => {
  const out = await withPlan(
    [
      unit('b', 'setup'),
      unit('a', 'setup', ['wut-no-such-cmd']),
      unit('c', 'install', [], ['wut-no-such-cmd']),
      unit('d', 'install', [], ['sh']),
    ],
    'scriptFindRun',
  )
  if (out != null) {
    assertEquals(out.split('\n').slice(0, 10), [
      'install',
      '  c',
      'setup',
      '  b',
      '',
      'not applicable',
      '  install',
      '    d',
      '  setup',
      '    a',
    ])
  }
})

Deno.test('script.nu - with nothing applicable the listing is only that group, and no table', async () => {
  const out = await withPlan(
    [unit('b', 'install', [], ['sh']), unit('a', 'setup', ['wut-no-such-cmd'])],
    'scriptFindRun',
  )
  if (out != null) {
    assertEquals(out.split('\n'), ['not applicable', '  install', '    b', '  setup', '    a'])
  }
})
