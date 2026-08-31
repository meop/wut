import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const PACK_NU = new URL('./pack.nu', import.meta.url).pathname
const SEL_NU = new URL('./sel.nu', import.meta.url).pathname

// `which` is the only thing these decisions read, so a PATH of stub binaries is the whole fixture
async function withManagers(present: Array<string>, probe: string): Promise<string | null> {
  return await withStubs(Object.fromEntries(present.map((n) => [n, ''])), probe)
}

// the installed checks read what a manager says, not just that it exists, so those stubs carry a body: the real
// listing formats, verbatim, since parsing them is the thing under test
async function withStubs(
  stubs: Record<string, string>,
  probe: string,
  managers: Array<string> = ['ghpm', 'brew', 'paru', 'yay', 'pacman', 'apt'],
  // manager files to source too, when the test runs an op end to end rather than probing one decision
  managerFiles: Array<string> = [],
): Promise<string | null> {
  const dir = await Deno.makeTempDir()
  const home = await Deno.makeTempDir()
  try {
    for (const [name, body] of Object.entries(stubs)) {
      const path = `${dir}/${name}`
      await Deno.writeTextFile(path, `#!/bin/sh\n${body}\n`)
      await Deno.chmod(path, 0o755)
    }
    const body = [
      // the same op helpers the client is sent, so the checks print and run exactly as they do in a real script
      await getScriptFlavorOpPreamble('nu'),
      await Deno.readTextFile(SEL_NU),
      await Deno.readTextFile(PACK_NU),
      ...await Promise.all(
        managerFiles.map((m) => Deno.readTextFile(new URL(`./pack/${m}.nu`, import.meta.url).pathname)),
      ),
      // the checks echo themselves, which is right in a run and noise in a decision probe
      ...(managerFiles.length ? [] : [`$env.SUCCINCT = '1'`]),
      // plain rather than coloured, so an assertion can match the command a check printed
      `$env.GRAYSCALE = '1'`,
      `$env.HOME = '${home}'`,
      `$env.PATH = ['${dir}']`,
      `$env.PACK_MANAGERS = ${JSON.stringify(managers).replaceAll('"', "'")}`,
      probe,
    ].join('\n')
    return await runNu(body)
  } finally {
    await Deno.remove(dir, { recursive: true })
    await Deno.remove(home, { recursive: true })
  }
}

// what each manager really prints, trimmed to the shapes that have to parse correctly
const LISTINGS: Record<string, string> = {
  ghpm: `case "$*" in
  "list --long-names") printf 'bat\\nnu\\nripgrep\\n' ;;
  *) exit 1 ;;
esac`,
  cargo: `case "$*" in
  "install --list") printf 'cargo-update v22.1.1:\\n    cargo-install-update\\n    cargo-install-update-config\\n' ;;
  *) exit 1 ;;
esac`,
  uv: `case "$*" in
  "tool list") printf 'git-filter-repo v2.47.0\\n- git-filter-repo\\nhf v1.29.0\\n- hf\\n' ;;
  *) exit 1 ;;
esac`,
  pnpm: `case "$*" in
  "list --global") printf '/home/x/.local/share/pnpm/global/v11 (PRIVATE)\\n\u2502\\n\u251c\u2500\u2500 node@26.2.0\\n\u2514\u2500\u2500 npm@12.0.2\\n' ;;
  *) exit 1 ;;
esac`,
  pacman: `case "$1" in
  --query) case "$2" in nushell) exit 0 ;; *) exit 1 ;; esac ;;
  *) exit 1 ;;
esac`,
}

Deno.test('nu / pack / the pacman family is offered once, widest first', async () => {
  const cases: Array<[Array<string>, string]> = [
    [['paru', 'yay', 'pacman'], 'paru'],
    [['yay', 'pacman'], 'yay'],
    [['pacman'], 'pacman'],
  ]
  for (const [present, expected] of cases) {
    const out = await withManagers(present, 'print (packManagersHere | str join " ")')
    if (out == null) {
      return
    }
    assertEquals(out, expected)
  }
})

// which of the three a group declared only narrows what is acceptable: a pacman entry is a repo package any of
// them can install, a yay entry is from the AUR and bare pacman cannot
Deno.test('nu / pack / a declared manager widens to an aur helper, never narrows to pacman', async () => {
  const probe = `print ([paru yay pacman] | each { |m| (packManagerBest $m | default 'none') } | str join " ")`
  const withHelper = await withManagers(['yay', 'pacman'], probe)
  if (withHelper == null) {
    return
  }
  assertEquals(withHelper, 'yay yay yay')
  assertEquals(await withManagers(['pacman'], probe), 'none none pacman')
})

// the bug this covers: remove resolved a loose name with packExists, which answers whether a manager *could*
// serve it. every one of these managers could serve git-filter-repo — it is on npm, on pypi, on github — so the
// walk stopped at the first one in preference order and uninstalled from a manager that never had it
Deno.test('nu / pack / remove picks the manager that has the name, not the first that could serve it', async () => {
  const out = await withStubs(
    { ghpm: LISTINGS.ghpm, cargo: LISTINGS.cargo, uv: LISTINGS.uv },
    [
      `$env.PACK_OP = 'remove'`,
      `print (packFindFirstIn (packManagersHere) 'git-filter-repo' | default 'none')`,
    ].join('\n'),
    ['ghpm', 'cargo', 'uv'],
  )
  if (out == null) {
    return
  }
  assertEquals(out, 'uv')
})

Deno.test('nu / pack / a name no manager has installed resolves to nothing rather than to the first manager', async () => {
  const out = await withStubs(
    { ghpm: LISTINGS.ghpm, cargo: LISTINGS.cargo, uv: LISTINGS.uv },
    [
      `$env.PACK_OP = 'remove'`,
      `print (packFindFirstIn (packManagersHere) 'ripgrep-x' | default 'none')`,
    ].join('\n'),
    ['ghpm', 'cargo', 'uv'],
  )
  if (out == null) {
    return
  }
  assertEquals(out, 'none')
})

// each listing hangs detail off its entries — uv repeats the tool as `- name`, cargo indents the binaries a crate
// installs — and reading that detail as an entry is how a check starts agreeing with everything
Deno.test('nu / pack / the listings parse to entry names, not to their detail lines', async () => {
  const probe = (manager: string, name: string) => `print (packInstalled '${manager}' '${name}')`
  const cases: Array<[string, string, string]> = [
    ['uv', 'git-filter-repo', 'true'],
    ['uv', 'hf', 'true'],
    // `- git-filter-repo` is uv restating the tool's own binary, not a second tool
    ['uv', 'repo', 'false'],
    ['cargo', 'cargo-update', 'true'],
    // the binaries cargo-update installs are indented under it; neither is a crate you can uninstall
    ['cargo', 'cargo-install-update', 'false'],
    ['ghpm', 'nu', 'true'],
    ['pnpm', 'node', 'true'],
    ['pnpm', 'npm', 'true'],
    ['pnpm', 'nod', 'false'],
  ]
  for (const [manager, name, expected] of cases) {
    const out = await withStubs(LISTINGS, probe(manager, name), Object.keys(LISTINGS))
    if (out == null) {
      return
    }
    assertEquals(out, expected, `${manager} / ${name}`)
  }
})

// exactly the reason packExists is exact rather than a search: pacman has nushell, not nushel
Deno.test('nu / pack / an installed check is exact, so a substring of a package is not that package', async () => {
  const probe = (name: string) => `print (packInstalled 'pacman' '${name}')`
  const out = await withStubs({ pacman: LISTINGS.pacman }, probe('nushell'), ['pacman'])
  if (out == null) {
    return
  }
  assertEquals(out, 'true')
  assertEquals(await withStubs({ pacman: LISTINGS.pacman }, probe('nushel'), ['pacman']), 'false')
})

// a group states which managers can serve it, never which one did; removing has to ask
Deno.test('nu / pack / removing a group skips a present manager that never installed it', async () => {
  const unit = JSON.stringify({
    group: 'nu',
    name: 'nu',
    paths: [
      { id: 'nu|cargo', manager: 'cargo', names: ['nu'] },
      { id: 'nu|ghpm', manager: 'ghpm', names: ['nu'] },
    ],
  })
  const probe = (op: string) =>
    [
      `$env.PACK_OP = '${op}'`,
      `print (packPickPath (${JSON.stringify(unit)} | from json) | get -o id | default 'none')`,
    ].join('\n')
  const out = await withStubs({ ghpm: LISTINGS.ghpm, cargo: LISTINGS.cargo }, probe('remove'), ['cargo', 'ghpm'])
  if (out == null) {
    return
  }
  // cargo is present and stated first, but ghpm is the one holding nu
  assertEquals(out, 'nu|ghpm')
  // adding still takes the first manager that is simply here, since nothing is installed yet to ask about
  assertEquals(
    await withStubs({ ghpm: LISTINGS.ghpm, cargo: LISTINGS.cargo }, probe('add'), ['cargo', 'ghpm']),
    'nu|cargo',
  )
})

// what started this: `p l <name>` found the name in uv while `p r <name>` did not, because one asked the manager's
// own listing and the other asked a registry. both now walk the same listings, so they agree by construction
Deno.test('nu / pack / list and remove agree on which manager holds a name', async () => {
  const stubs = { ghpm: LISTINGS.ghpm, cargo: LISTINGS.cargo, uv: LISTINGS.uv }
  const managers = ['ghpm', 'cargo', 'uv']
  const listed = await withStubs(
    stubs,
    `print ((packManagersHere) | where { |m| packLinesLike (packListedRaw $m) 'git-filter-repo' } | str join ' ')`,
    managers,
  )
  if (listed == null) {
    return
  }
  const removed = await withStubs(
    stubs,
    [`$env.PACK_OP = 'remove'`, `print (packFindFirstIn (packManagersHere) 'git-filter-repo' | default 'none')`].join(
      '\n',
    ),
    managers,
  )
  assertEquals(listed, 'uv')
  assertEquals(removed, 'uv')
})

// list is WIDE (substring, act on all) where remove is PINPOINT and exact — see docs/COMMANDS.md. the substring
// half is what a `p l git` has always meant, so the up-front check has to keep it
Deno.test('nu / pack / list matches on substring while remove matches exactly', async () => {
  const stubs = { uv: LISTINGS.uv }
  const like = (term: string) => `print (packLinesLike (packListedRaw 'uv') '${term}')`
  assertEquals(await withStubs(stubs, like('filter'), ['uv']), 'true')
  assertEquals(await withStubs(stubs, like('GIT-FILTER'), ['uv']), 'true')
  const exact = await withStubs(stubs, `print (packInstalled 'uv' 'filter')`, ['uv'])
  if (exact == null) {
    return
  }
  assertEquals(exact, 'false')
})

// a bare `list` has nothing cheaper than the dump itself, so it keeps the plainer manager-only plan: nothing is
// run before the table. with a term there is a local answer worth having first, so the listing runs up front
Deno.test('nu / pack / list runs a listing before the gate only when it has a term to answer', async () => {
  const run = (probe: string) =>
    withStubs(
      { uv: LISTINGS.uv },
      [`$env.PACK_OP = 'list'`, `$env.YES = '1'`, probe].join('\n'),
      ['uv'],
      ['uv'],
    )

  const bare = await run('packListPlanRun')
  if (bare == null) {
    return
  }
  // one dump, after the gate — the table is reached without having asked uv anything
  assertEquals(bare.split('uv tool list').length - 1, 1)
  assertEquals(bare.includes('git-filter-repo v2.47.0'), true)

  const termed = await run([`$env.PACK_LIST_NAMES = ['git-filter-repo']`, 'packListPlanRun'].join('\n'))
  // twice: once to answer before the gate, once to dump after
  assertEquals(termed!.split('uv tool list').length - 1, 2)
  assertEquals(termed!.includes('1) uv'), true)
})
