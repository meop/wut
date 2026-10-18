import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const SCRIPT_NU = new URL('./script.nu', import.meta.url).pathname
const SEL_NU = new URL('./sel.nu', import.meta.url).pathname

// a plan the way the server writes one; sh is on every PATH these tests run on, and the other command on none
async function withPlan(units: Array<Record<string, unknown>>, probe: string) {
  return await runNu([
    await getScriptFlavorOpPreamble('nu'),
    await Deno.readTextFile(SEL_NU),
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
  more: { desktop?: string; noSsh?: boolean; paths?: Array<string> } = {},
) => ({
  id: `${tool}/${action}`,
  action,
  tool,
  shell: 'zsh',
  cmds,
  noCmds,
  svcs,
  noSvcs,
  paths: [],
  desktop: '',
  noSsh: false,
  ...more,
})

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

Deno.test('script.nu - the listing shows what is needed, then a group per reason for the rest', async () => {
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
    assertEquals(out.split('\n').slice(0, 12), [
      'install',
      '  c',
      'setup',
      '  b',
      '',
      'unmet tool dependency',
      '  setup',
      '    a (wut-no-such-cmd)',
      '',
      'found tool already',
      '  install',
      '    d',
    ])
  }
})

// a path is how a macos app shows it is installed; / is on every machine these tests run on
Deno.test('script.nu - has_path needs one of its paths, and a script without one is short of a tool', async () => {
  const units = [
    unit('path-here', 'setup', [], [], [], [], { paths: ['/'] }),
    unit('either-here', 'setup', [], [], [], [], { paths: ['/wut-no-such-path', '~'] }),
    unit('path-missing', 'setup', [], [], [], [], { paths: ['/wut-no-such-path', '~/wut-no-such-path'] }),
  ]
  const here = await withPlan(units, `print (scriptPlanHere | get tool | str join ',')`)
  if (here != null) {
    assertEquals(here, 'path-here,either-here')
  }
  const out = await withPlan(units, 'scriptFindRun')
  if (out != null) {
    assertEquals(out.split('\n').slice(3, 6), [
      'unmet tool dependency',
      '  setup',
      '    path-missing (/wut-no-such-path or ~/wut-no-such-path)',
    ])
  }
})

// pxe is short of syslinux, which its own name does not say; docker is short of docker, which it does
Deno.test('script.nu - a missing tool is named with what it is short of, where its own name does not say', async () => {
  const out = await withPlan(
    [
      unit('wut-no-such-cmd', 'setup', ['wut-no-such-cmd']),
      unit('other-name', 'setup', ['wut-no-such-a', 'wut-no-such-b']),
    ],
    'scriptFindRun',
  )
  if (out != null) {
    assertEquals(out.split('\n'), [
      'unmet tool dependency',
      '  setup',
      '    other-name (wut-no-such-a or wut-no-such-b), wut-no-such-cmd',
    ])
  }
})

Deno.test('script.nu - with nothing needed the listing is only those groups, and no table', async () => {
  const out = await withPlan(
    [unit('b', 'install', [], ['sh']), unit('a', 'setup', ['wut-no-such-cmd'])],
    'scriptFindRun',
  )
  if (out != null) {
    assertEquals(out.split('\n'), [
      'unmet tool dependency',
      '  setup',
      '    a (wut-no-such-cmd)',
      '',
      'found tool already',
      '  install',
      '    b',
    ])
  }
})

// a script short of more than one thing is listed under the hardest to put right: a wrong desktop, then no desktop,
// which ssh is to a no_ssh script, then a missing tool, so a tool is all that group is short of
Deno.test('script.nu - a session gate lists its script under what the session is short of', async () => {
  const units = [
    unit('a', 'setup'),
    unit('b', 'setup', ['wut-no-such-cmd'], [], [], [], { desktop: 'none' }),
    unit('c', 'repair', ['wut-no-such-cmd'], [], [], [], { noSsh: true }),
    unit('d', 'setup', ['wut-no-such-cmd'], [], [], [], { desktop: 'other' }),
    unit('e', 'setup', ['sh'], [], [], [], { desktop: 'other' }),
    unit('f', 'setup', ['wut-no-such-cmd']),
    unit('g', 'install', [], ['sh'], [], [], { desktop: 'other' }),
  ]
  const overSsh = await withPlan(units, `$env.SSH_CONNECTION = '10.0.0.1 1 10.0.0.2 22'\nscriptFindRun`)
  if (overSsh != null) {
    assertEquals(overSsh.split('\n').slice(0, 20), [
      'setup',
      '  a',
      '',
      'unmet tool dependency',
      '  setup',
      '    f (wut-no-such-cmd)',
      '',
      'no desktop session',
      '  repair',
      '    c',
      '  setup',
      '    b',
      '',
      'wrong desktop session',
      '  setup',
      '    d, e',
      '',
      'found tool already',
      '  install',
      '    g',
    ])
  }
  const local = await withPlan(
    units,
    `hide-env --ignore-errors SSH_CONNECTION\nprint (scriptPlanHere | get tool | str join ',')`,
  )
  if (local != null) {
    assertEquals(local, 'a')
  }
})
