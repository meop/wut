import { stripVTControlCharacters } from 'node:util'

import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const PACK_NU = new URL('./pack.nu', import.meta.url).pathname
const SEL_NU = new URL('./sel.nu', import.meta.url).pathname
const PATH_NU = new URL('./path.nu', import.meta.url).pathname
const MATCH_NU = new URL('./match.nu', import.meta.url).pathname

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
  allowFailure = false,
  // rows to pick instead of prompting, or a body that picks them, for a run with more than one table
  pick?: Array<number> | string,
): Promise<string | null> {
  const dir = await Deno.makeTempDir()
  const home = await Deno.makeTempDir()
  try {
    // a stub named ~/<path> is put under the test's home instead, its dir ahead of the others on PATH: where an
    // installer of its own would put it, like gotm's go
    const path: Array<string> = []
    for (const [name, body] of Object.entries(stubs)) {
      const at = name.startsWith('~/') ? `${home}/${name.slice(2)}` : `${dir}/${name}`
      const atDir = at.slice(0, at.lastIndexOf('/'))
      if (atDir !== dir && !path.includes(atDir)) {
        await Deno.mkdir(atDir, { recursive: true })
        path.push(atDir)
      }
      await Deno.writeTextFile(at, `#!/bin/sh\n${body}\n`)
      await Deno.chmod(at, 0o755)
    }
    path.push(dir)
    const body = [
      // the same op helpers the client is sent, so the checks print and run exactly as they do in a real script
      await getScriptFlavorOpPreamble('nu'),
      await Deno.readTextFile(PATH_NU),
      await Deno.readTextFile(MATCH_NU),
      pick == null ? await Deno.readTextFile(SEL_NU) : (await Deno.readTextFile(SEL_NU)).replace(
        /^def wutSelectRead [\s\S]*?^}$/m,
        `def wutSelectRead [max: int] { ${
          typeof pick === 'string' ? pick : JSON.stringify(pick).replaceAll(',', ' ')
        } }`,
      ),
      await Deno.readTextFile(PACK_NU),
      ...await Promise.all(
        managerFiles.map((m) => Deno.readTextFile(new URL(`./pack/${m}.nu`, import.meta.url).pathname)),
      ),
      // the checks echo themselves, which is right in a run and noise in a decision probe
      ...(managerFiles.length ? [] : [`$env.SUCCINCT = '1'`]),
      // plain rather than coloured, so an assertion can match the command a check printed
      `$env.GRAYSCALE = '1'`,
      `$env.HOME = '${home}'`,
      `$env.PATH = ${JSON.stringify(path).replaceAll('"', "'")}`,
      `$env.PACK_MANAGERS = ${JSON.stringify(managers).replaceAll('"', "'")}`,
      probe,
    ].join('\n')
    return await runNu(body, allowFailure)
  } finally {
    await Deno.remove(dir, { recursive: true })
    await Deno.remove(home, { recursive: true })
  }
}

// a rustc beside cargo, as every cargo has: one from another install is a split, and the cargo is not offered
const RUSTC = `printf 'rustc 1.99.1 (58cf8f9c3 2026-10-13)\\n'`

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
  // the tree is what `list` dumps; --parseable is what every check reads, one full path per line
  pnpm: `case "$*" in
  "list --global") printf '/home/x/.local/share/pnpm/global/v11 (PRIVATE)\\n\u2502\\n\u251c\u2500\u2500 node@26.2.0\\n\u2514\u2500\u2500 npm@12.0.2\\n' ;;
  "list --global --parseable") printf '/home/x/.local/share/pnpm/global/v11\\n/home/x/.local/share/pnpm/global/v11/bf5-19e/node_modules/node\\n/home/x/.local/share/pnpm/global/v11/833-1a0/node_modules/npm\\n/home/x/.local/share/pnpm/global/v11/aa1-2b3/node_modules/@scope/tool\\n' ;;
  *) exit 1 ;;
esac`,
  // brew's own two answers disagree: `list` names formulae and casks alike, `list --versions <name>` resolves
  // formulae only, so it exits 1 on a cask that is very much installed
  brew: `case "$*" in
  "list") printf 'jq\\nvivaldi\\nzstd\\n' ;;
  "list --cask") printf 'vivaldi\\n' ;;
  "list --formula") printf 'jq\\nzstd\\n' ;;
  "list --versions vivaldi") exit 1 ;;
  "list --versions jq") printf 'jq 1.8.1\\n' ;;
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
    // a scoped name is one name, and only the path form spells it whole
    ['pnpm', '@scope/tool', 'true'],
    ['pnpm', 'tool', 'false'],
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
      `print (packPickPaths (${JSON.stringify(unit)} | from json) | each { |p| $p.id } | str join ' ')`,
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
  // sync asks the same installed question remove does, and being WIDE keeps every manager that answered yes
  assertEquals(
    await withStubs({ ghpm: LISTINGS.ghpm, cargo: LISTINGS.cargo }, probe('sync'), ['cargo', 'ghpm']),
    'nu|ghpm',
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
Deno.test('nu / pack / list matches the start of a word while remove matches exactly', async () => {
  const stubs = { uv: LISTINGS.uv }
  const like = (term: string) => `print (packLinesLike (packListedRaw 'uv') '${term}')`
  assertEquals(await withStubs(stubs, like('filter'), ['uv']), 'true')
  assertEquals(await withStubs(stubs, like('GIT-FILTER'), ['uv']), 'true')
  // the middle of a word is not its start
  assertEquals(await withStubs(stubs, like('ilter'), ['uv']), 'false')
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

  const bare = await run(`packTermPlanRun 'PACK_LIST_NAMES'`)
  if (bare == null) {
    return
  }
  // one dump, after the gate — the table is reached without having asked uv anything
  assertEquals(bare.split('uv tool list').length - 1, 1)
  assertEquals(bare.includes('git-filter-repo v2.47.0'), true)

  const termed = await run(
    [`$env.PACK_LIST_NAMES = ['git-filter-repo']`, `packTermPlanRun 'PACK_LIST_NAMES'`].join('\n'),
  )
  // twice: once to answer before the gate, once to dump after
  assertEquals(termed!.split('uv tool list').length - 1, 2)
  assertEquals(termed!.includes('1) uv'), true)

  // the dump is filtered by the same rule that answered: a term that starts a word of a line keeps the line
  const started = await run([`$env.PACK_LIST_NAMES = ['filter']`, `packTermPlanRun 'PACK_LIST_NAMES'`].join('\n'))
  assertEquals(stripVTControlCharacters(started!).includes('git-filter-repo v2.47.0'), true)

  // the summary before the gate names what matched, never the term: `wut p l go` showed `go` under ghpm, go and
  // winget, which read as each having a package called go when they had gotm, gopls and goose game. hf is not
  // shown, since filter starts no word of it
  const summary = stripVTControlCharacters(started!).split('1) uv')[0].split('uv tool list').slice(1).join('')
  assertEquals(summary.includes('  git-filter-repo v2.47.0'), true)
  assertEquals(summary.includes('  filter'), false)
  assertEquals(summary.includes('hf'), false)
})

// the bug this covers: `wut p l vivaldi` found it under brew and `wut p r vivaldi` said no manager had it, moments
// apart on the same machine. `list` reads `brew list`, which names casks; the installed check asked
// `brew list --versions vivaldi`, which resolves formulae only and exits 1 on every cask
Deno.test('nu / pack / brew has a cask that its formula-only version query cannot see', async () => {
  const probe = (name: string) => `print (packInstalled 'brew' '${name}')`
  const out = await withStubs({ brew: LISTINGS.brew }, probe('vivaldi'), ['brew'])
  if (out == null) {
    return
  }
  assertEquals(out, 'true')
  assertEquals(await withStubs({ brew: LISTINGS.brew }, probe('jq'), ['brew']), 'true')
  assertEquals(await withStubs({ brew: LISTINGS.brew }, probe('vivaldo'), ['brew']), 'false')
})

// vivaldi is a cask, jq a formula, and the flag on a name has to narrow the check the same way it narrows the
// install — otherwise `--formula vivaldi` would answer true off the unnarrowed listing
Deno.test("nu / pack / a name's flags narrow the installed check, not just the install", async () => {
  const probe = (raw: string) => `print (packInstalled 'brew' '${raw}')`
  const out = await withStubs({ brew: LISTINGS.brew }, probe('--cask vivaldi'), ['brew'])
  if (out == null) {
    return
  }
  assertEquals(out, 'true')
  assertEquals(await withStubs({ brew: LISTINGS.brew }, probe('--formula jq'), ['brew']), 'true')
  // the flavor that is not installed, under a name that is
  assertEquals(await withStubs({ brew: LISTINGS.brew }, probe('--formula vivaldi'), ['brew']), 'false')
  assertEquals(await withStubs({ brew: LISTINGS.brew }, probe('--cask jq'), ['brew']), 'false')
  // a bare flag names no package at all
  assertEquals(await withStubs({ brew: LISTINGS.brew }, probe('--cask'), ['brew']), 'false')
})

// the flags are not distributive over the call: `brew uninstall --cask a --formula b` is not a thing brew accepts,
// so each distinct flag set gets its own invocation, in the order the names first introduce them
Deno.test('nu / pack / names carrying different flags are issued as separate invocations', async () => {
  const out = await withStubs(
    { brew: LISTINGS.brew },
    [
      `$env.NOOP = '1'`,
      `$env.PACK_REMOVE_NAMES = ['--cask vivaldi', 'jq', '--cask slack', '--formula node', 'zstd']`,
      `packOpRemove [brew uninstall]`,
    ].join('\n'),
    ['brew'],
    ['brew'],
  )
  if (out == null) {
    return
  }
  const calls = out.split('\n').filter((l) => l.startsWith('brew uninstall'))
  assertEquals(calls, [
    'brew uninstall --cask vivaldi slack',
    'brew uninstall jq zstd',
    'brew uninstall --formula node',
  ])
})

// what started this: `wut p s vlc` offered all eight managers and then handed the name to each one, so a manager
// that had never heard of vlc ran an upgrade against it — and deno, whose install is its update, installed it
Deno.test('nu / pack / a named sync only runs the managers that hold the name', async () => {
  const run = (names: Array<string>) =>
    withStubs(
      { ghpm: LISTINGS.ghpm, uv: LISTINGS.uv },
      [
        `$env.PACK_OP = 'sync'`,
        `$env.YES = '1'`,
        `$env.NOOP = '1'`,
        `$env.PACK_PLAN = '[]'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packPlanRun',
      ].join('\n'),
      ['ghpm', 'uv'],
      ['ghpm', 'uv'],
    )

  const held = await run(['nu'])
  if (held == null) {
    return
  }
  // ghpm has nu, uv does not: one row, one sync, and uv is never handed the name
  assertEquals(held.includes('1) ghpm'), true)
  assertEquals(held.includes('uv)'), false)
  assertEquals(held.includes('ghpm sync nu'), true)
  assertEquals(held.includes('uv tool upgrade'), false)

  const absent = await run(['vlc'])
  // nothing has it, so there is nothing to ask about: the checks answer and the run stops
  assertEquals(absent!.includes('no manager has installed: vlc'), true)
  assertEquals(absent!.includes('ghpm sync'), false)
  assertEquals(absent!.includes('uv tool upgrade'), false)
})

// add's search asks every manager, not just the first that has a name: ghpm and cargo both have lazygit here, so the
// managers are a second pick and the name goes to the one picked. a name only one has goes there without asking,
// and -y picks every row, which is wut's order again
Deno.test('nu / pack / add picks between the managers that all have a name', async () => {
  const ghpm = `case "$*" in
  "info lazygit --non-interactive") exit 0 ;;
  "info "*) exit 1 ;;
  *) exit 0 ;;
esac`
  const cargo = `case "$*" in
  "info lazygit"|"info onlycargo") exit 0 ;;
  "info "*) exit 1 ;;
  *) exit 0 ;;
esac`
  const run = (names: Array<string>, pick: string | null) =>
    withStubs(
      { ghpm, cargo, rustc: RUSTC },
      [
        `$env.PACK_OP = 'add'`,
        ...(pick == null ? [`$env.YES = '1'`] : []),
        `$env.NOOP = '1'`,
        `$env.PACK_PLAN = '[]'`,
        `$env.PACK_ADD_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packPlanRun',
      ].join('\n'),
      ['ghpm', 'cargo'],
      ['ghpm', 'cargo'],
      false,
      // the first table holds only '?'; the second, ghpm then cargo, is answered with cargo
      pick ?? undefined,
    )
  const installs = (out: string) =>
    out.split('\n').filter((l) => /^(ghpm install|cargo binstall) /.test(l)).map((l) => l.split(' ').at(-1))

  const picked = await run(['lazygit'], 'if $max == 1 { [1] } else { [2] }')
  if (picked == null) {
    return
  }
  assertEquals(picked.includes('2) cargo'), true)
  assertEquals(installs(picked), ['lazygit'])
  assertEquals(picked.includes('ghpm install'), false)

  const every = (await run(['lazygit'], null))!
  assertEquals(installs(every), ['lazygit'])
  assertEquals(every.includes('ghpm install lazygit'), true)

  // one manager has it: no second table
  const single = (await run(['onlycargo'], 'if $max == 1 { [1] } else { [] }'))!
  assertEquals(single.includes('2) cargo'), false)
  assertEquals(installs(single), ['onlycargo'])
})

// remove and sync both offer every manager holding a name: a name two managers both hold is not settled by whichever
// sorts first, the table is where one is picked. picking uv takes hf out of uv alone
Deno.test('nu / pack / remove and sync offer every manager holding a name, and the pick decides', async () => {
  const ghpm = `case "$*" in\n  "list --long-names") printf 'hf\\n' ;;\n  *) exit 0 ;;\nesac`
  const run = (op: string, pick: Array<number>) =>
    withStubs(
      { ghpm, uv: LISTINGS.uv },
      [
        `$env.PACK_OP = '${op}'`,
        `$env.NOOP = '1'`,
        `$env.PACK_PLAN = '[]'`,
        `$env.PACK_${op.toUpperCase()}_NAMES = ['hf']`,
        'packPlanRun',
      ].join('\n'),
      ['ghpm', 'uv'],
      ['ghpm', 'uv'],
      false,
      pick,
    )
  const removed = await run('remove', [2])
  if (removed == null) {
    return
  }
  assertEquals(removed.includes('1) ghpm'), true)
  assertEquals(removed.includes('2) uv'), true)
  assertEquals(removed.includes('uv tool uninstall hf'), true)
  assertEquals(removed.includes('ghpm uninstall'), false)
  assertEquals((await run('remove', [1, 2]))!.includes('ghpm uninstall hf'), true)
  const synced = (await run('sync', [1, 2]))!
  assertEquals(synced.includes('ghpm sync hf'), true)
  assertEquals(synced.includes('uv tool upgrade hf'), true)
})

// a group states which managers can serve it, never which one did, so a sync of a group nothing here holds has the
// same answer a loose name does: nothing to do, said once
Deno.test('nu / pack / syncing a group no manager holds says so rather than picking one', async () => {
  const unit = JSON.stringify({
    group: 'media/vlc',
    name: 'vlc',
    paths: [
      { id: 'media/vlc|ghpm', manager: 'ghpm', names: ['vlc'] },
      { id: 'media/vlc|uv', manager: 'uv', names: ['vlc'] },
    ],
  })
  const out = await withStubs(
    { ghpm: LISTINGS.ghpm, uv: LISTINGS.uv },
    [
      `$env.PACK_OP = 'sync'`,
      `$env.YES = '1'`,
      `$env.NOOP = '1'`,
      `$env.PACK_PLAN = ${JSON.stringify(`[${unit}]`)}`,
      `$env.PACK_SYNC_NAMES = [  ]`,
      'packPlanRun',
    ].join('\n'),
    ['ghpm', 'uv'],
    ['ghpm', 'uv'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('no manager has installed: vlc'), true)
  assertEquals(out.includes('ghpm sync'), false)
  assertEquals(out.includes('uv tool upgrade'), false)
})

// deno's install is its update: `deno install --force --global vlc@latest` installs a name it has never seen, so
// a sync that reaches deno with an unheld name does not update anything, it adds it
Deno.test('nu / pack / sync never installs a name the manager does not hold', async () => {
  const run = (manager: string, names: Array<string>, files: Array<string>) =>
    withStubs(
      { ghpm: LISTINGS.ghpm, uv: LISTINGS.uv, pacman: LISTINGS.pacman },
      [
        `$env.PACK_OP = 'sync'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = '${manager}'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        `pack${manager[0].toUpperCase()}${manager.slice(1)}`,
      ].join('\n'),
      ['ghpm', 'uv', 'pacman'],
      files,
    )

  // deno is not on this PATH at all, so the guard is asked through a manager that is: ghpm holds nu, not vlc
  const mixed = await run('ghpm', ['nu', 'vlc'], ['ghpm'])
  if (mixed == null) {
    return
  }
  assertEquals(mixed.includes('ghpm sync nu'), true)
  assertEquals(mixed.includes('vlc'), false)

  // nothing asked for is held, so the manager runs nothing — never the whole-manager upgrade
  const none = await run('ghpm', ['vlc'], ['ghpm'])
  assertEquals(none!.includes('ghpm sync'), false)

  // `pacman --sync --needed` would install a name it does not find, the same way. the check that answers that
  // names vlc out loud, as every check does, so what matters is that no install line carries it
  const native = await run('pacman', ['nushell', 'vlc'], ['pacman'])
  assertEquals(native!.includes('--sync --needed nushell'), true)
  assertEquals(native!.split('\n').some((l) => l.includes('--sync --needed') && l.includes('vlc')), false)
})

// the same listing answered every name in the plan and was run — and printed — once per name
Deno.test('nu / pack / a listing is asked once a run, however many names it answers', async () => {
  const out = await withStubs(
    { uv: LISTINGS.uv },
    [
      `$env.PACK_OP = 'remove'`,
      `mut answers = []`,
      `for n in ['git-filter-repo', 'hf', 'nope'] { $answers = ($answers | append (packInstalled 'uv' $n)) }`,
      `print ($answers | str join ' ')`,
    ].join('\n'),
    ['uv'],
    ['uv'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.split('uv tool list').length - 1, 1)
  assertEquals(out.trim().endsWith('true true false'), true)
})

// three ways deno's listing came back empty: nu's `ls` hides the dot directory deno keeps beside each shim, the
// list op ran a wut function through packOp — which runs its argument in a fresh `nu -c` that has never heard of
// it, and swallowed the not-found error — and the path was built from $env.HOME, which windows does not set
Deno.test('nu / pack / deno lists the global installs it actually holds', async () => {
  const seed = [
    `mkdir ([$env.HOME '.deno' 'bin' '.yarn'] | path join)`,
    `touch ([$env.HOME '.deno' 'bin' 'yarn'] | path join)`,
    `touch ([$env.HOME '.deno' 'bin' 'deno'] | path join)`,
  ]
  const held = await withStubs({}, [...seed, `print (packDenoInstalled | str join ' ')`].join('\n'), ['deno'])
  if (held == null) {
    return
  }
  // the shim's own file is not an install, and the dot directory beside it is the only record that it is one
  assertEquals(held.trim().endsWith('yarn'), true)

  const listed = await withStubs(
    { deno: '' },
    [...seed, `$env.PACK_OP = 'list'`, `$env.PACK_MANAGER = 'deno'`, 'packDeno'].join('\n'),
    ['deno'],
    ['deno'],
  )
  assertEquals(listed!.includes('yarn'), true)
  // and the check that answers for it agrees, rather than reporting nothing installed
  const check = await withStubs({}, [...seed, `print (packInstalled 'deno' 'yarn')`].join('\n'), ['deno'])
  assertEquals(check!.trim().endsWith('true'), true)
})

// uv has no info command: it can only be asked about a tool it already has, as the venv under `uv tool dir`.
// pointing that at a name it does not have printed uv's own complaint about missing virtualenvs, so the fallback
// is pypi — not exercised here, since that half reaches the network
Deno.test('nu / pack / uv info asks the tool venv it actually has', async () => {
  const out = await withStubs(
    { uv: `case "$*" in\n  "tool dir") printf '%s/tools\\n' "$HOME" ;;\n  *) exit 1 ;;\nesac` },
    [
      `mkdir ([$env.HOME 'tools' 'hf' 'bin'] | path join)`,
      `touch ([$env.HOME 'tools' 'hf' 'bin' 'python'] | path join)`,
      `$env.PACK_OP = 'info'`,
      `$env.PACK_MANAGER = 'uv'`,
      `$env.PACK_INFO_NAMES = ['hf']`,
      'packUv',
    ].join('\n'),
    ['uv'],
    ['uv'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('uv pip show --python'), true)
  assertEquals(out.includes('/tools/hf/bin/python hf'), true)
  assertEquals(out.includes('pypi.org'), false)
})

// a group knows each manager's own name for what was typed, and asking pacman about `nu` when the group says
// `nushell` is asking about nothing. a name no group claimed is asked as typed, of everyone
Deno.test('nu / pack / info asks each manager the name that manager declared', async () => {
  const probe = (manager: string, map: string, loose: Array<string>) =>
    withStubs(
      {},
      [
        `$env.PACK_MANAGER = '${manager}'`,
        `$env.PACK_INFO_MAP = '${map}'`,
        `$env.PACK_INFO_NAMES = ${JSON.stringify(loose).replaceAll('"', "'")}`,
        `print (packInfoNames | str join ' ')`,
      ].join('\n'),
      ['ghpm', 'pacman'],
    )
  const map = `{"ghpm":["nu"],"pacman":["nushell"]}`
  const declared = await probe('pacman', map, [])
  if (declared == null) {
    return
  }
  assertEquals(declared, 'nushell')
  assertEquals(await probe('ghpm', map, []), 'nu')
  // the aur helpers answer to what the group declared for pacman
  assertEquals(await probe('yay', map, []), 'nushell')
  // a manager the group never named has nothing declared, and only the unclaimed names to ask about
  assertEquals(await probe('uv', map, ['btm']), 'btm')
  assertEquals(await probe('pacman', map, ['btm']), 'nushell btm')
})

// bun decides what a command means by walking up from the cwd for a package.json: `bun info` fails outside a
// project and reads someone else's inside one, and `bun pm cache` — bun's own global cache — does the same. wut
// runs bun from bun's own global project, seeding the manifest bun would have written, and puts the cwd back
Deno.test('nu / pack / bun runs from its global project, whatever the cwd was', async () => {
  const run = (op: string) =>
    withStubs(
      { bun: `printf '%s\\n' "$PWD"` },
      [
        // pointed at a temp root, so the test seeds its own global project rather than the machine's
        `$env.BUN_INSTALL = ([$env.HOME 'bi'] | path join)`,
        `let before = $env.PWD`,
        `$env.PACK_OP = '${op}'`,
        `$env.PACK_MANAGER = 'bun'`,
        `$env.PACK_INFO_NAMES = ['chalk']`,
        'packBun',
        `print (if $before == $env.PWD { 'cwd kept' } else { 'cwd moved' })`,
      ].join('\n'),
      ['bun'],
      ['bun'],
    )

  const listed = await run('list')
  if (listed == null) {
    return
  }
  // the stub reports where bun was run from: the global project, not the directory wut was invoked in
  assertEquals(listed.includes('/bi/install/global'), true)
  assertEquals(listed.trim().endsWith('cwd kept'), true)

  const info = await run('info')
  assertEquals(info!.includes('/bi/install/global'), true)
  assertEquals(info!.trim().endsWith('cwd kept'), true)
})

// the same question asked from a rust project used to get the project's answer, and from a deno project an error
// about the project's node_modules setting: neither op is about a project, so neither reads one
Deno.test('nu / pack / deno asks about a package, not about the project you are standing in', async () => {
  const out = await withStubs(
    { deno: '' },
    [
      `$env.NOOP = '1'`,
      `$env.PACK_OP = 'info'`,
      `$env.PACK_MANAGER = 'deno'`,
      `$env.PACK_INFO_NAMES = ['chalk']`,
      'packDeno',
    ].join('\n'),
    ['deno'],
    ['deno'],
  )
  if (out == null) {
    return
  }
  for (const line of ['deno info --no-config --no-lock npm:chalk', 'deno info --no-config --no-lock jsr:chalk']) {
    assertEquals(out.includes(line), true, line)
  }
})

// the bug this covers: a plain `wut p l python` reached the table, took the pick and then died with
// `apt: Can't convert to list<string>`. the elevated managers shadowed their own name with the `sudo apt` they
// invoke, and packListCmd is keyed by the bare name, so it answered null for every one of them. only reachable
// where sudo is on PATH, which is why the listing kept working in the tests and nowhere else
Deno.test('nu / pack / an elevated manager still knows its own listing command', async () => {
  // manager, the binary its listing runs, and the arguments packListCmd states for it
  const cases: Array<[string, string, string]> = [
    ['apk', 'apk', 'list --installed'],
    ['apt', 'apt', 'list --installed'],
    ['dnf', 'dnf', 'list --installed'],
    ['emerge', 'qlist', '--installed'],
    ['xbps', 'xbps-query', '--list-pkgs'],
    ['zypper', 'zypper', 'packages --installed-only'],
  ]
  for (const [manager, bin, args] of cases) {
    const listing = `printf 'python 3.13.7\\n'`
    const stubs: Record<string, string> = { sudo: 'exec "$@"', [manager]: listing, [bin]: listing }
    if (manager === 'xbps') {
      stubs['xbps-install'] = ''
    }
    const out = await withStubs(
      stubs,
      [
        `$env.PACK_OP = 'list'`,
        `$env.YES = '1'`,
        `$env.PACK_LIST_NAMES = ['python']`,
        `packTermPlanRun 'PACK_LIST_NAMES'`,
      ]
        .join('\n'),
      [manager],
      [manager],
    )
    if (out == null) {
      return
    }
    assertEquals(out.includes('failed:'), false, `${manager}: ${out}`)
    assertEquals(out.includes(`${bin} ${args}`), true, `${manager}: ${out}`)
    // the dump is the manager's own listing, asked as itself: sudo belongs to the ops that change something
    assertEquals(out.includes(`sudo ${bin}`), false, `${manager}: ${out}`)
    assertEquals(out.includes('python 3.13.7'), true, `${manager}: ${out}`)
  }
})

// a group's post scripts run only for groups that installed, after every install in the run, once however many
// groups name them — and their has_cmd is asked then, since the install is what put the command there
Deno.test('nu / pack / post scripts run after the installs that succeeded, once each', async () => {
  const unit = (group: string, post: Array<[string, Array<string>]>) => ({
    group,
    name: group,
    paths: [{ id: `${group}|pacman`, manager: 'pacman', names: [group] }],
    post: post.map(([id, cmds]) => ({ id, cmds })),
  })
  const plan = [
    unit('rustup', [['rustup/setup', ['rustup']], ['cargo/setup', ['cargo']]]),
    unit('broken', [['podman/setup', []]]),
    unit('docker', [['docker/setup', ['docker']], ['cargo/setup', ['cargo']]]),
  ]
  const out = await withStubs(
    { pacman: '', rustup: '', cargo: '' },
    [
      // the listing and the skip notice are what is under test here, not just the decision
      `hide-env SUCCINCT`,
      `def --env packRunUnit [id: string] {`,
      `  if $id == 'broken|pacman' { error make { msg: 'install failed' } }`,
      `  print $"ran ($id)"`,
      `}`,
      `$env.PACK_OP = 'add'`,
      `$env.YES = '1'`,
      `$env.PACK_PLAN = ${JSON.stringify(JSON.stringify(plan))}`,
      `$env.PACK_ADD_NAMES = [  ]`,
      'packPlanRun',
    ].join('\n'),
    ['pacman'],
    [],
    true,
  )
  if (out == null) {
    return
  }
  const ran = out.split('\n').filter((l) => l.startsWith('ran ')).map((l) => l.slice(4))
  // every install first, then each post script once, in the order the groups named them
  assertEquals(ran, ['rustup|pacman', 'docker|pacman', 'rustup/setup', 'cargo/setup'])
  // the group that failed to install has nothing run after it, though the plan listed it
  assertEquals(out.includes('then: podman/setup'), true)
  assertEquals(ran.includes('podman/setup'), false)
  // docker is nowhere, even after the refresh, so its post script says so rather than running
  assertEquals(out.includes('docker/setup skipped: docker not found'), true)
  assertEquals(out.includes('then: rustup/setup, cargo/setup'), true)
})

// the mirror: pre scripts run before any removal, while the commands they undo are still there
Deno.test('nu / pack / pre scripts run before the removals, once each', async () => {
  const unit = (group: string, pre: Array<[string, Array<string>]>) => ({
    group,
    name: group,
    paths: [{ id: `${group}|pacman`, manager: 'pacman', names: [group] }],
    pre: pre.map(([id, cmds]) => ({ id, cmds })),
  })
  const plan = [
    unit('docker', [['docker/teardown', ['docker']]]),
    unit('podman', [['podman/teardown', ['podman']], ['docker/teardown', ['docker']]]),
  ]
  const out = await withStubs(
    // pacman answers that both are installed, so both are removed through it
    { pacman: 'exit 0', docker: '' },
    [
      `hide-env SUCCINCT`,
      `def --env packRunUnit [id: string] { print $"ran ($id)" }`,
      `$env.PACK_OP = 'remove'`,
      `$env.YES = '1'`,
      `$env.PACK_PLAN = ${JSON.stringify(JSON.stringify(plan))}`,
      `$env.PACK_REMOVE_NAMES = [  ]`,
      'packPlanRun',
    ].join('\n'),
    ['pacman'],
  )
  if (out == null) {
    return
  }
  const ran = out.split('\n').filter((l) => l.startsWith('ran ')).map((l) => l.slice(4))
  assertEquals(ran, ['docker/teardown', 'docker|pacman', 'podman|pacman'])
  // podman is already gone from this PATH, so there is nothing for its teardown to act on
  assertEquals(out.includes('podman/teardown skipped: podman not found'), true)
  assertEquals(out.includes('first: podman/teardown, docker/teardown'), true)
})

// a folder brings its groups along — `go` is lang/go and everything under lang/go/ — so each group is a row of its
// own, and taking golangci-lint out does not take gotm with it. each loose name is a row of its own too
Deno.test('nu / pack / each group and each loose name is its own row', async () => {
  const unit = (group: string, names: Array<string>) => ({
    group,
    name: 'go',
    paths: [{ id: `${group}|ghpm`, manager: 'ghpm', names }],
  })
  const plan = [unit('lang/go', ['golangci-lint']), unit('lang/go/gotm', ['gotm'])]
  const ghpm =
    `case "$*" in\n  "list --long-names") printf 'golangci-lint\\ngotm\\nbat\\nfd\\n' ;;\n  *) exit 0 ;;\nesac`
  const run = (pick: Array<number> | undefined) =>
    withStubs(
      { ghpm },
      [
        `def --env packRunUnit [id: string] { print $"ran ($id)" }`,
        ...(pick == null ? [`$env.YES = '1'`] : []),
        `$env.PACK_OP = 'remove'`,
        `$env.NOOP = '1'`,
        `$env.PACK_PLAN = ${JSON.stringify(JSON.stringify(plan))}`,
        `$env.PACK_REMOVE_NAMES = ['bat' 'fd']`,
        'packPlanRun',
      ].join('\n'),
      ['ghpm'],
      ['ghpm'],
      false,
      pick,
    )
  const ran = (out: string) => out.split('\n').filter((l) => l.startsWith('ran ')).map((l) => l.slice(4))
  const uninstalls = (out: string) => out.split('\n').filter((l) => l.startsWith('ghpm uninstall'))

  const one = await run([1])
  if (one == null) {
    return
  }
  const rows = one.split('\n').filter((l) => /^\d+\) /.test(l))
  // a row holds one thing: the summary above is where a group's packages are listed
  assertEquals(rows, ['1) ghpm lang/go', '2) ghpm lang/go/gotm', '3) ghpm              bat', '4) ghpm              fd'])
  assertEquals(ran(one), ['lang/go|ghpm'])
  assertEquals(uninstalls(one), [])

  // one loose name runs alone
  const loose = (await run([4]))!
  assertEquals(ran(loose), [])
  assertEquals(uninstalls(loose), ['ghpm uninstall fd'])

  // -y is still every row
  const every = (await run(undefined))!
  assertEquals(ran(every), ['lang/go|ghpm', 'lang/go/gotm|ghpm'])
  assertEquals(uninstalls(every), ['ghpm uninstall bat fd'])
})

// a tool its own installer put down updates itself by that path, and it is best effort: one that refuses — built
// without self update, turned off, owned by something else — says so, and the rest of the sync still runs
Deno.test('nu / pack / standalone installs update themselves, and a refusal does not stop the run', async () => {
  const self = [
    { group: 'lang/yes', path: '{HOME}/.yes/bin/yes', args: ['self', 'update'] },
    { group: 'lang/no', path: '{HOME}/.no/bin/no', args: ['upgrade'] },
    { group: 'lang/absent', path: '{HOME}/.absent/bin/absent', args: ['upgrade'] },
  ]
  const out = await withStubs(
    {},
    [
      `hide-env SUCCINCT`,
      `mkdir ($env.HOME | path join .yes bin) ($env.HOME | path join .no bin)`,
      `"#!/bin/sh\\necho \\"updated $*\\"\\n" | save ($env.HOME | path join .yes bin yes)`,
      `"#!/bin/sh\\necho 'self update is disabled for this build'\\nexit 1\\n" | save ($env.HOME | path join .no bin no)`,
      `^/bin/chmod +x ($env.HOME | path join .yes bin yes) ($env.HOME | path join .no bin no)`,
      `$env.PACK_OP = 'sync'`,
      `$env.YES = '1'`,
      `$env.PACK_SELF = ${JSON.stringify(JSON.stringify(self))}`,
      'packManagerPlanRun',
      `print 'run finished'`,
    ].join('\n'),
    [],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('1) script'), true)
  assertEquals(out.includes('updated self update'), true)
  assertEquals(out.includes('lang/no did not update itself'), true)
  // nothing at its path, so there is nothing to ask
  assertEquals(out.includes('absent'), false)
  // a refusal is an answer, not a failure: the run reports nothing and goes on
  assertEquals(out.includes('failed:'), false)
  assertEquals(out.includes('run finished'), true)
})

// a manager its own installer put down updates itself right before it syncs, not after every other manager has run;
// a tool that is no manager waits for the script row
Deno.test('nu / pack / a manager updates itself right before its own sync', async () => {
  const self = [
    { group: 'ai/code/codex', path: '{HOME}/.local/bin/codex', args: ['update'] },
    { group: 'sys/manager/ghpm', path: '{HOME}/.ghpm/bin/ghpm', args: ['upgrade'] },
  ]
  const out = await withStubs(
    { brew: '', ghpm: '' },
    [
      `hide-env SUCCINCT`,
      `mkdir ($env.HOME | path join .ghpm bin) ($env.HOME | path join .local bin)`,
      `touch ($env.HOME | path join .ghpm bin ghpm) ($env.HOME | path join .local bin codex)`,
      `def --env packBrew [] { print 'ran brew' }`,
      `def --env packGhpm [] { print 'ran ghpm' }`,
      `$env.YES = '1'`,
      `$env.PACK_OP = 'sync'`,
      `$env.NOOP = '1'`,
      `$env.PACK_SELF = ${JSON.stringify(JSON.stringify(self))}`,
      'packManagerPlanRun',
    ].join('\n'),
    ['brew', 'ghpm'],
  )
  if (out == null) {
    return
  }
  const order = out.split('\n').filter((l) => /^ran |upgrade$|update$/.test(l)).map((l) => l.split('/').pop())
  assertEquals(order, ['ran brew', 'ghpm upgrade', 'ran ghpm', 'codex update'])
})

Deno.test('nu / pack / picking a manager alone still updates it first', async () => {
  const self = [
    { group: 'ai/code/codex', path: '{HOME}/.local/bin/codex', args: ['update'] },
    { group: 'sys/manager/ghpm', path: '{HOME}/.ghpm/bin/ghpm', args: ['upgrade'] },
  ]
  const out = await withStubs(
    { brew: '', ghpm: '' },
    [
      `hide-env SUCCINCT`,
      `mkdir ($env.HOME | path join .ghpm bin) ($env.HOME | path join .local bin)`,
      `touch ($env.HOME | path join .ghpm bin ghpm) ($env.HOME | path join .local bin codex)`,
      `def --env packBrew [] { print 'ran brew' }`,
      `def --env packGhpm [] { print 'ran ghpm' }`,
      `$env.PACK_OP = 'sync'`,
      `$env.NOOP = '1'`,
      `$env.PACK_SELF = ${JSON.stringify(JSON.stringify(self))}`,
      'packManagerPlanRun',
    ].join('\n'),
    ['brew', 'ghpm'],
    [],
    false,
    [2],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('3) script'), true)
  const order = out.split('\n').filter((l) => /^ran |upgrade$|update$/.test(l)).map((l) => l.split('/').pop())
  assertEquals(order, ['ghpm upgrade', 'ran ghpm'])
})

Deno.test('nu / pack / no script row when every standalone install is a manager here', async () => {
  const self = [{ group: 'sys/manager/ghpm', path: '{HOME}/.ghpm/bin/ghpm', args: ['upgrade'] }]
  const out = await withStubs(
    { ghpm: '' },
    [
      `hide-env SUCCINCT`,
      `mkdir ($env.HOME | path join .ghpm bin)`,
      `touch ($env.HOME | path join .ghpm bin ghpm)`,
      `def --env packGhpm [] { print 'ran ghpm' }`,
      `$env.YES = '1'`,
      `$env.PACK_OP = 'sync'`,
      `$env.NOOP = '1'`,
      `$env.PACK_SELF = ${JSON.stringify(JSON.stringify(self))}`,
      'packManagerPlanRun',
    ].join('\n'),
    ['ghpm'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('script'), false)
  const order = out.split('\n').filter((l) => /^ran |upgrade$/.test(l)).map((l) => l.split('/').pop())
  assertEquals(order, ['ghpm upgrade', 'ran ghpm'])
})

// cargo on PATH is rustup's proxy when a rustup sits beside it, and the toolchains update before the crates do. a
// cargo with no rustup beside it is a distro's, and a named sync is about the crates it names
Deno.test('nu / pack / cargo updates the toolchains first only when rustup is behind it', async () => {
  const run = (stubs: Record<string, string>, names: Array<string>) =>
    withStubs(
      stubs,
      [
        `$env.PACK_OP = 'sync'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = 'cargo'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packCargo',
      ].join('\n'),
      ['cargo'],
      ['cargo'],
    )
  const proxied = await run({ cargo: LISTINGS.cargo, rustup: '' }, [])
  if (proxied == null) {
    return
  }
  const lines = proxied.split('\n')
  const rustup = lines.findIndex((l) => l.endsWith('rustup update'))
  const crates = lines.findIndex((l) => l.includes('cargo install-update --all'))
  assertEquals(rustup > -1, true)
  assertEquals(rustup < crates, true)
  assertEquals((await run({ cargo: LISTINGS.cargo }, []))!.includes('rustup update'), false)
  assertEquals((await run({ cargo: LISTINGS.cargo, rustup: '' }, ['cargo-update']))!.includes('rustup update'), false)
})

// a rustup toolchain's name is its pin, and rustup update moves each in place, so there is nothing for a tidy to let go:
// one a project's rust-toolchain.toml asked for is a pin as much as one installed by hand
Deno.test('nu / pack / cargo tidy leaves every rustup toolchain', async () => {
  const rustup = `case "$*" in
  "toolchain list") printf 'stable-x86_64-unknown-linux-gnu (active, default)\\n1.98-x86_64-unknown-linux-gnu\\n1.99.0-x86_64-unknown-linux-gnu\\n' ;;
  *) exit 0 ;;
esac`
  const out = await withStubs(
    { cargo: LISTINGS.cargo, rustup },
    [`$env.PACK_OP = 'tidy'`, `$env.NOOP = '1'`, `$env.PACK_MANAGER = 'cargo'`, 'packCargo'].join('\n'),
    ['cargo'],
    ['cargo'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('toolchain uninstall'), false)
  assertEquals(out.includes('cargo cache --autoclean'), true)
})

// go has no listing or uninstall of its own: a tool is a binary in its bin dir that names the package it was built
// from, and a tool answers to its package path or its binary's name. an install always builds, so sync installs only
// what a newer release or a newer toolchain has left behind, and outdated lists the same tools
Deno.test('nu / pack / go reads its tools from the binaries it built', async () => {
  const stub = (toolchain: string) =>
    `case "$*" in
  "env GOBIN") printf '\\n' ;;
  "env GOVERSION") printf '${toolchain}\\n' ;;
  "list -m -f "*/gopls@latest) printf 'v0.23.0\\n' ;;
  "list -m -f "*/golangci-lint/v2@latest) printf 'v2.14.0\\n' ;;
  "env GOPATH") printf '%s/go\\n' "$HOME" ;;
  "version -m "*/gopls) printf '%s: go1.27.0\\n\\tpath\\tgolang.org/x/tools/gopls\\n\\tmod\\tgolang.org/x/tools/gopls\\tv0.23.0\\th1:x=\\n' "$3" ;;
  "version -m "*/golangci-lint) printf '%s: go1.27.0\\n\\tpath\\tgithub.com/golangci/golangci-lint/v2/cmd/golangci-lint\\n\\tmod\\tgithub.com/golangci/golangci-lint/v2\\tv2.13.2\\th1:x=\\n' "$3" ;;
  *) exit 0 ;;
esac`
  const run = (op: string, names: Array<string>, toolchain = 'go1.27.0') =>
    withStubs(
      { go: stub(toolchain) },
      [
        `mkdir ($env.HOME | path join go bin)`,
        `touch ($env.HOME | path join go bin gopls) ($env.HOME | path join go bin golangci-lint)`,
        `$env.PACK_OP = '${op}'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = 'go'`,
        `$env.PACK_${op.toUpperCase()}_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packGo',
      ].join('\n'),
      ['go'],
      ['go'],
    )
  const installs = (out: string) =>
    out.split('\n').filter((l) => l.includes('go install')).map((l) => l.split(' ').find((t) => t.endsWith('@latest')))
  const bare = await run('sync', [])
  if (bare == null) {
    return
  }
  const both = [
    'github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest',
    'golang.org/x/tools/gopls@latest',
  ]
  // gopls is at its latest release and built by this toolchain: only the tool with a newer release installs
  assertEquals(installs(bare), [both[0]])
  assertEquals(installs((await run('sync', ['gopls']))!), [])
  // a newer toolchain rebuilds a tool whose release has not moved, and no version has to be looked up to know it
  assertEquals(installs((await run('sync', [], 'go1.27.1'))!).sort(), both)
  assertEquals(installs((await run('sync', ['gopls'], 'go1.27.1'))!), ['golang.org/x/tools/gopls@latest'])
  // older, not different: a tool a downloaded toolchain built is ahead of this one, and an experiment or a release
  // candidate of the same release is not a move
  assertEquals(installs((await run('sync', ['gopls'], 'go1.26.9'))!), [])
  assertEquals(installs((await run('sync', ['gopls'], 'go1.27.0-X:nodwarf5'))!), [])
  assertEquals(installs((await run('sync', ['gopls'], 'go1.27rc1'))!), [])
  assertEquals(installs((await run('sync', ['gopls'], 'go1.100.0'))!), ['golang.org/x/tools/gopls@latest'])
  const outdated = (l: string) => l.includes(' -> ')
  assertEquals((await run('outdated', []))!.split('\n').filter(outdated), [
    'github.com/golangci/golangci-lint/v2/cmd/golangci-lint v2.13.2 -> v2.14.0',
  ])
  assertEquals((await run('outdated', [], 'go1.27.1'))!.split('\n').filter(outdated), [
    'github.com/golangci/golangci-lint/v2/cmd/golangci-lint v2.13.2 -> v2.14.0',
    'golang.org/x/tools/gopls v0.23.0 go1.27.0 -> go1.27.1',
  ])
  assertEquals(installs((await run('add', ['golang.org/x/tools/gopls']))!), ['golang.org/x/tools/gopls@latest'])
  const removed = (await run('remove', ['golang.org/x/tools/gopls']))!
  assertEquals(removed.split('\n').filter((l) => l.includes('rm ')).length, 1)
  assertEquals(removed.includes('/go/bin/gopls'), true)
  const listed = (await run('list', []))!
  assertEquals(listed.includes('golang.org/x/tools/gopls v0.23.0'), true)
})

// gotm is to go what rustup is to cargo: where it is on PATH, a bare go sync has it move the toolchains before the
// tools rebuild against them. a go with no gotm is another manager's, and a named sync is about the tools it names
Deno.test('nu / pack / go has gotm move the toolchains first, only where gotm is', async () => {
  const go = `case "$*" in
  "env GOBIN") printf '\\n' ;;
  "env GOVERSION") printf 'go1.27.0\\n' ;;
  "env GOPATH") printf '%s/go\\n' "$HOME" ;;
  "version -m "*/gopls) printf '%s: go1.26.0\\n\\tpath\\tgolang.org/x/tools/gopls\\n\\tmod\\tgolang.org/x/tools/gopls\\tv0.23.0\\th1:x=\\n' "$3" ;;
  *) exit 0 ;;
esac`
  const run = (stubs: Record<string, string>, names: Array<string>) =>
    withStubs(
      stubs,
      [
        `mkdir ($env.HOME | path join go bin)`,
        `touch ($env.HOME | path join go bin gopls)`,
        `$env.PACK_OP = 'sync'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = 'go'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packGo',
      ].join('\n'),
      ['go'],
      ['go'],
    )
  const managed = await run({ '~/.gotm/bin/go': go, gotm: '' }, [])
  if (managed == null) {
    return
  }
  const lines = managed.split('\n')
  const gotm = lines.findIndex((l) => l.endsWith('gotm sync'))
  const tools = lines.findIndex((l) => l.includes('go install golang.org/x/tools/gopls@latest'))
  assertEquals(gotm > -1, true)
  assertEquals(tools > -1, true)
  assertEquals(gotm < tools, true)
  assertEquals((await run({ go }, []))!.includes('gotm sync'), false)
  // a gotm on PATH is not behind a go it did not put down
  assertEquals((await run({ go, gotm: '' }, []))!.includes('gotm sync'), false)
  assertEquals((await run({ '~/.gotm/bin/go': go, gotm: '' }, ['gopls']))!.includes('gotm sync'), false)
})

// gotm keeps its downloaded archives until its own tidy runs, so a go tidy asks it first, only where gotm is
Deno.test('nu / pack / go tidy has gotm tidy its toolchains, only where gotm is', async () => {
  const run = (stubs: Record<string, string>) =>
    withStubs(
      stubs,
      [`$env.PACK_OP = 'tidy'`, `$env.NOOP = '1'`, `$env.PACK_MANAGER = 'go'`, 'packGo'].join('\n'),
      ['go'],
      ['go'],
    )
  const managed = await run({ go: '', gotm: '' })
  if (managed == null) {
    return
  }
  const lines = managed.split('\n')
  const gotm = lines.findIndex((l) => l.includes('gotm tidy'))
  const cache = lines.findIndex((l) => l.includes('go clean -modcache'))
  assertEquals(gotm > -1, true)
  assertEquals(cache > -1, true)
  assertEquals(gotm < cache, true)
  const unmanaged = (await run({ go: '' }))!
  assertEquals(unmanaged.includes('gotm tidy'), false)
  assertEquals(unmanaged.includes('go clean -modcache'), true)
})

// pnpm records a runtime as the exact version it installed, so `update` cannot move it: a runtime is set again at its
// latest release, and packages update to latest. a named sync touches only what it names
Deno.test('nu / pack / pnpm sets its runtimes to latest and updates its packages', async () => {
  const pnpm = `case "$*" in
  "list --global --parseable") printf '/h/global/v11\\n/h/global/v11/a/node_modules/node\\n/h/global/v11/b/node_modules/npm\\n/h/global/v11/c/node_modules/deno\\n' ;;
  "list --global --json") printf '[{"dependencies":{"node":{"version":"26.2.0"},"npm":{"version":"12.0.2"},"deno":{"version":"2.9.7"}}}]' ;;
  *) exit 1 ;;
esac`
  const run = (names: Array<string>) =>
    withStubs(
      { pnpm },
      [
        `$env.PACK_OP = 'sync'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = 'pnpm'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packPnpm',
      ].join('\n'),
      ['pnpm'],
      ['pnpm'],
    )
  const bare = await run([])
  if (bare == null) {
    return
  }
  assertEquals(bare.includes('pnpm runtime set node latest --global'), true)
  assertEquals(bare.includes('pnpm runtime set deno latest --global'), true)
  assertEquals(bare.includes('pnpm update --global --latest npm'), true)
  assertEquals(bare.includes('--latest node'), false)
  const named = await run(['npm'])
  assertEquals(named!.includes('runtime set'), false)
  assertEquals(named!.includes('pnpm update --global --latest npm'), true)
})

// uv manages pythons as well as tools: a bare sync moves the pythons first, and a named sync is about the tools named
Deno.test('nu / pack / uv upgrades its pythons before its tools on a bare sync', async () => {
  const run = (names: Array<string>) =>
    withStubs(
      { uv: LISTINGS.uv },
      [
        `$env.PACK_OP = 'sync'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = 'uv'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packUv',
      ].join('\n'),
      ['uv'],
      ['uv'],
    )
  const bare = await run([])
  if (bare == null) {
    return
  }
  const lines = bare.split('\n')
  const pythons = lines.findIndex((l) => l.includes('uv python upgrade'))
  const tools = lines.findIndex((l) => l.includes('uv tool upgrade --all'))
  assertEquals(pythons > -1, true)
  assertEquals(pythons < tools, true)
  assertEquals((await run(['hf']))!.includes('python upgrade'), false)
})

// the run's PATH starts as the one a new shell would have: the env stage adds each place a tool lands once it exists,
// so a command installed since the calling shell started — or by this run — is found without that shell reopening
Deno.test('nu / pack / a refreshed PATH reaches what the env stage adds', async () => {
  const zsh = new Deno.Command('sh', { args: ['-c', 'command -v zsh'], stdout: 'piped' }).outputSync()
  if (!zsh.success) {
    return
  }
  const out = await withStubs(
    {},
    [
      `$env.SYS_OS_PLAT = 'linux'`,
      `mkdir ($env.HOME | path join .tool bin)`,
      `'path=($HOME/.tool/bin $path)' | save ($env.HOME | path join .zshenv)`,
      `$env.PATH = ($env.PATH | append ['/usr/bin' '/bin'])`,
      `print $"before: ($env.PATH | any { |p| $p | str ends-with '.tool/bin' })"`,
      'wutPathRefresh',
      `print $"after: ($env.PATH | any { |p| $p | str ends-with '.tool/bin' })"`,
      `print $"kept: ('/usr/bin' in $env.PATH)"`,
    ].join('\n'),
    [],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('before: false'), true)
  assertEquals(out.includes('after: true'), true)
  assertEquals(out.includes('kept: true'), true)
})

// a post script whose command an install just put somewhere the calling shell never reached still runs
Deno.test('nu / pack / a post script finds what the run just installed', async () => {
  const zsh = new Deno.Command('sh', { args: ['-c', 'command -v zsh'], stdout: 'piped' }).outputSync()
  if (!zsh.success) {
    return
  }
  const plan = [{
    group: 'lang/rust/rustup',
    name: 'rustup',
    paths: [{ id: 'lang/rust/rustup|pacman', manager: 'pacman', names: ['rustup'] }],
    post: [{ id: 'rustup/setup', cmds: ['rustup'] }],
  }]
  const out = await withStubs(
    { pacman: '' },
    [
      `hide-env SUCCINCT`,
      `$env.SYS_OS_PLAT = 'linux'`,
      `$env.PATH = ($env.PATH | append ['/usr/bin' '/bin'])`,
      `'path=($HOME/.cargo/bin $path)' | save ($env.HOME | path join .zshenv)`,
      // the install is what puts rustup where only the env stage knows to look
      `def --env packRunUnit [id: string] {`,
      `  if $id == 'lang/rust/rustup|pacman' {`,
      `    mkdir ($env.HOME | path join .cargo bin)`,
      `    "#!/bin/sh\\n" | save ($env.HOME | path join .cargo bin rustup)`,
      `    ^/bin/chmod +x ($env.HOME | path join .cargo bin rustup)`,
      `  }`,
      `  print $"ran ($id)"`,
      `}`,
      `$env.PACK_OP = 'add'`,
      `$env.YES = '1'`,
      `$env.PACK_PLAN = ${JSON.stringify(JSON.stringify(plan))}`,
      `$env.PACK_ADD_NAMES = [  ]`,
      'packPlanRun',
    ].join('\n'),
    ['pacman'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.includes('ran rustup/setup'), true)
  assertEquals(out.includes('skipped'), false)
})

// a tool whose manager the same run puts down waits for the group that puts it down, and for that group's post
// scripts, which are what put the language itself down: `wut p a node` on a machine with no pnpm yet still ends with
// node-gyp. the installs that put pnpm somewhere only the env stage knows are stubbed the way rustup's is above
const STAGED_PLAN = (gypPaths: Array<string>) => [
  {
    group: 'lang/node',
    name: 'node',
    provides: ['pnpm'],
    paths: [{ id: 'lang/node|ghpm', manager: 'ghpm', names: ['pnpm'] }],
    post: [{ id: 'pnpm/setup', cmds: ['pnpm'] }],
  },
  {
    group: 'lang/node/node-gyp',
    name: 'node',
    paths: gypPaths.map((m) => ({ id: `lang/node/node-gyp|${m}`, manager: m, names: ['node-gyp'] })),
  },
]
async function runStaged(gypPaths: Array<string>, putsPnpm: boolean, op = 'add', stubs: Record<string, string> = {}) {
  const zsh = new Deno.Command('sh', { args: ['-c', 'command -v zsh'], stdout: 'piped' }).outputSync()
  if (!zsh.success) {
    return null
  }
  return await withStubs(
    { ghpm: '', ...stubs },
    [
      `$env.SYS_OS_PLAT = 'linux'`,
      `$env.PATH = ($env.PATH | append ['/usr/bin' '/bin'])`,
      `'path=($HOME/.pnpm $path)' | save ($env.HOME | path join .zshenv)`,
      `def --env packRunUnit [id: string] {`,
      ...(putsPnpm
        ? [
          `  if $id == 'lang/node|ghpm' {`,
          `    mkdir ($env.HOME | path join .pnpm)`,
          `    "#!/bin/sh\\n" | save ($env.HOME | path join .pnpm pnpm)`,
          `    ^/bin/chmod +x ($env.HOME | path join .pnpm pnpm)`,
          `  }`,
        ]
        : []),
      `  print $"ran ($id)"`,
      `}`,
      `$env.PACK_OP = '${op}'`,
      `$env.YES = '1'`,
      `$env.PACK_PLAN = ${JSON.stringify(JSON.stringify(STAGED_PLAN(gypPaths)))}`,
      `$env.PACK_${op.toUpperCase()}_NAMES = [  ]`,
      'packPlanRun',
    ].join('\n'),
    ['ghpm', 'pnpm'],
    // a pnpm here is asked what it runs on, as every client is sent each manager's file
    ['pnpm'],
  )
}
const ranOf = (out: string) => out.split('\n').filter((l) => l.startsWith('ran ')).map((l) => l.slice(4))

Deno.test('nu / pack / a group waits for the group that puts its manager down', async () => {
  const out = await runStaged(['pnpm'], true)
  if (out == null) {
    return
  }
  // the summary says what it waits for; the row is still one group under the manager it will run through
  assertEquals(out.includes('pnpm\n  lang/node/node-gyp\n    node-gyp\n    after: lang/node\n'), true)
  assertEquals(out.includes('2) pnpm lang/node/node-gyp'), true)
  // pnpm, then its setup, then what pnpm serves
  assertEquals(ranOf(out), ['lang/node|ghpm', 'pnpm/setup', 'lang/node/node-gyp|pnpm'])
})

Deno.test('nu / pack / a group whose manager never turns up falls to the next one here, and says so', async () => {
  const fell = await runStaged(['pnpm', 'ghpm'], false)
  if (fell == null) {
    return
  }
  assertEquals(fell.includes('lang/node/node-gyp: pnpm is not here, using ghpm'), true)
  assertEquals(ranOf(fell), ['lang/node|ghpm', 'lang/node/node-gyp|ghpm'])

  const none = (await runStaged(['pnpm'], false))!
  assertEquals(none.includes('lang/node/node-gyp skipped: pnpm is not here'), true)
  assertEquals(ranOf(none), ['lang/node|ghpm'])
})

// removing walks the stages the other way: node-gyp goes while pnpm is still there to take it out
Deno.test('nu / pack / remove takes a tool out before the group that put its manager down', async () => {
  const out = await runStaged(['pnpm'], false, 'remove', {
    ghpm: `case "$*" in\n  "list --long-names") printf 'pnpm\\n' ;;\n  *) exit 0 ;;\nesac`,
    pnpm:
      `case "$*" in\n  "list --global --parseable") printf '/g/node_modules/node\\n/g/node_modules/node-gyp\\n' ;;\n  "bin --global") printf '%s\\n' "\${0%/*}" ;;\n  *) exit 0 ;;\nesac`,
    node: `printf 'v26.12.0\\n'`,
  })
  if (out == null) {
    return
  }
  // the fixture's post script is add's; the server never sends it with a remove, so only the units matter here
  assertEquals(ranOf(out).filter((r) => r.includes('|')), ['lang/node/node-gyp|pnpm', 'lang/node|ghpm'])
})

// a manager and what it runs on come from one install. what each runs on is its row's toolchain, and one that is split
// across two installs is said once and not offered
const held = async (
  stubs: Record<string, string>,
  managers: Array<string>,
  setup: Array<string> = [],
  op = 'sync',
) => {
  const out = await withStubs(
    stubs,
    [...setup, `$env.PACK_OP = '${op}'`, 'packManagerCheck', `print ($env.PACK_HELD? | default {} | to json --raw)`]
      .join('\n'),
    managers,
    managers,
  )
  if (out == null) {
    return null
  }
  const lines = out.split('\n')
  // what was said before the answer: the checks it ran, then each split and the lines under it
  return { said: lines.slice(0, -1), held: JSON.parse(lines.at(-1)!) }
}
const fine = (note: string) => ({ note, split: '', detail: [] })

const GO = `case "$*" in
  "env GOVERSION") printf 'go1.27.0\\n' ;;
  *) exit 0 ;;
esac`

Deno.test('nu / pack / the manager table names what each manager runs on', async () => {
  const out = await withStubs(
    { cargo: LISTINGS.cargo, rustc: RUSTC, rustup: '', '~/.gotm/bin/go': GO },
    [`$env.PACK_OP = 'sync'`, 'packManagerPlanRun'].join('\n'),
    ['cargo', 'go'],
    ['cargo', 'go'],
    false,
    'null',
  )
  if (out == null) {
    return
  }
  const rows = stripVTControlCharacters(out).split('\n')
  assertEquals(rows.some((l) => /^manager\s+toolchain$/.test(l)), true)
  assertEquals(rows.some((l) => /^1\) cargo\s+rust 1\.99\.1 \(rustup\)$/.test(l)), true)
  assertEquals(rows.some((l) => /^2\) go\s+go 1\.27\.0 \(gotm\)$/.test(l)), true)
})

Deno.test('nu / pack / cargo is split from a rustc or rustup another install put on PATH', async () => {
  const one = await held({ cargo: '', rustc: RUSTC }, ['cargo'])
  if (one == null) {
    return
  }
  assertEquals(one.held.cargo, fine('rust 1.99.1'))
  // the check is shown, as every check is
  assertEquals(one.said, ['rustc --version'])

  // cargo runs inside its own dir, so a rustc further up PATH is not the one it builds with
  const ahead = (await held({ '~/other/rustc': RUSTC, cargo: '', rustc: RUSTC }, ['cargo']))!
  assertEquals(ahead.held.cargo, fine('rust 1.99.1'))

  // with none beside it, it would build with another install's
  const apart = (await held({ '~/other/rustc': RUSTC, cargo: '' }, ['cargo']))!
  assertEquals(apart.held.cargo.split, "rustc is another install's")
  // the reason is one short line, and what to look at is under it
  assertEquals(apart.said[0], "cargo skipped: rustc is another install's")
  assertEquals(/^ {2}cargo \/.+\/cargo$/.test(apart.said[1]), true)
  assertEquals(/^ {2}rustc \/.+\/other\/rustc$/.test(apart.said[2]), true)

  // rustup's rustc proxy fails when there is no toolchain for it to run
  const empty = (await held({ cargo: '', rustc: 'exit 1', rustup: '' }, ['cargo']))!
  assertEquals(empty.held.cargo.split, 'rustup has no default toolchain')
  assertEquals(empty.held.cargo.detail, ['rustup default stable'])

  // only an install or a sync builds on it: the read ops, and a remove that undoes a split, still reach it
  assertEquals((await held({ '~/other/rustc': RUSTC, cargo: '' }, ['cargo'], [], 'remove'))!.held, {})
})

Deno.test('nu / pack / a split manager is not offered', async () => {
  const out = await withStubs(
    { '~/other/rustc': RUSTC, cargo: LISTINGS.cargo, ghpm: '' },
    [`$env.PACK_OP = 'sync'`, 'packManagerPlanRun'].join('\n'),
    ['ghpm', 'cargo'],
    ['cargo'],
    false,
    'null',
  )
  if (out == null) {
    return
  }
  const rows = stripVTControlCharacters(out).split('\n')
  assertEquals(rows.filter((l) => l.includes('skipped:')).length, 1)
  assertEquals(rows.some((l) => /^1\) ghpm/.test(l)), true)
  assertEquals(rows.some((l) => /^\d\) cargo/.test(l)), false)
})

Deno.test('nu / pack / of the gos here, the local one is the row, asked inside its own copy', async () => {
  const owned = await held({ '~/.gotm/bin/go': GO }, ['go'])
  if (owned == null) {
    return
  }
  assertEquals(owned.held.go, fine('go 1.27.0 (gotm)'))
  assertEquals(owned.said, ['go env GOVERSION'])
  assertEquals((await held({ go: GO }, ['go']))!.held.go, fine('go 1.27.0'))

  // a distro's go ahead of gotm's on PATH is the system's install, and not used where one in the home is: gotm's is
  // the row, and answers with its own toolchain though PATH finds the other first
  const both = (await held({ go: GO.replace('go1.27.0', 'go1.26.0'), '~/.gotm/bin/go': GO }, ['go'], [
    `$env.PATH = ($env.PATH | reverse)`,
  ]))!
  assertEquals(both.held, { go: fine('go 1.27.0 (gotm)') })
  assertEquals(both.said, ['go env GOVERSION'])
  const gofmt = (await held({ '~/sys/bin/gofmt': '', go: GO }, ['go']))!
  assertEquals(gofmt.held.go.split, "gofmt is another install's")
})

// pnpm's bin dir holds its runtimes beside its packages' commands, which run on the node there before any on PATH
const PNPM = (listed: Array<string>) =>
  `case "$*" in
  "list --global --parseable") printf '${listed.map((n) => `/g/node_modules/${n}\\n`).join('')}' ;;
  "bin --global") printf '%s\\n' "\${0%/*}" ;;
  *) exit 0 ;;
esac`
const NODE = `printf 'v26.12.0\\n'`

Deno.test('nu / pack / pnpm is split when its packages would run on a node it does not hold', async () => {
  const own = await held({ pnpm: PNPM(['node', 'npm']), node: NODE }, ['pnpm'])
  if (own == null) {
    return
  }
  assertEquals(own.held.pnpm, fine('node 26.12.0'))
  assertEquals(own.said, ['pnpm bin --global', 'pnpm list --global --parseable', 'node --version'])
  // nothing held, nothing to run: a pnpm with no packages is not split
  assertEquals((await held({ pnpm: PNPM([]) }, ['pnpm']))!.held.pnpm, fine(''))

  const none = (await held({ pnpm: PNPM(['npm']), node: NODE }, ['pnpm']))!
  assertEquals(none.held.pnpm.split, 'pnpm holds no node for its packages')
  assertEquals(none.held.pnpm.detail, ['pnpm runtime set node latest --global'])
  // its packages run on the node beside them, so another node ahead on PATH takes nothing from it
  const shadowed =
    (await held({ '~/sys/bin/node': `printf 'v20.0.0\\n'`, pnpm: PNPM(['node']), node: NODE }, ['pnpm']))!
  assertEquals(shadowed.held.pnpm, fine('node 26.12.0'))
})

Deno.test('nu / pack / pnpm puts its own node down before its first package', async () => {
  const run = (listed: Array<string>, names: Array<string>) =>
    withStubs(
      { pnpm: PNPM(listed) },
      [
        `$env.PACK_OP = 'add'`,
        `$env.NOOP = '1'`,
        `$env.PACK_MANAGER = 'pnpm'`,
        `$env.PACK_ADD_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packPnpm',
      ].join('\n'),
      ['pnpm'],
      ['pnpm'],
    )
  const bare = await run([], ['npm'])
  if (bare == null) {
    return
  }
  const lines = bare.split('\n')
  const node = lines.findIndex((l) => l.includes('pnpm runtime set node latest --global'))
  const pkg = lines.findIndex((l) => l.includes('pnpm add --global npm'))
  assertEquals(node > -1 && pkg > -1 && node < pkg, true)
  assertEquals((await run(['node'], ['npm']))!.includes('runtime set node'), false)
  assertEquals((await run([], ['node']))!.includes('runtime set node'), false)
})

// uv's own pythons, as `uv python list --only-installed --managed-python --output-format json` names them: each once
// for the install, and again for every link to it, under the install's key
const UV_PYTHON = (version: string, path = '') => {
  const [major, minor, patch] = version.split('.').map((n) => parseInt(n))
  const key = `cpython-${version}-linux-x86_64-gnu`
  return {
    key,
    version,
    version_parts: { major, minor, patch },
    path: path || `@HOME@/py/${key}/bin/python${major}.${minor}`,
    os: 'linux',
    arch: 'x86_64',
    libc: 'gnu',
    variant: 'default',
    implementation: 'cpython',
  }
}
// a stub's printf of json that names paths under the test's home: the stub's PATH holds only stubs, so $HOME is spliced
// in by printf itself, which repeats '%s' over every argument
const UV_PRINTF = (value: unknown) =>
  `printf '%s' ${JSON.stringify(value).split('@HOME@').map((part) => `'${part}'`).join(' "$HOME" ')}`
// downloads are what uv could install beside what is in: the newest patch of each minor, a pre-release among them.
// links are what uv's bin dir holds, by name, each to the install it reaches: one named by a path under home is
// elsewhere, as a minor's own link in uv's python dir is
const UV = (pythons: Array<string>, downloads: Array<string> = [], links: Record<string, string> = {}) =>
  `case "$*" in
  "tool dir") printf '%s\\n' "$HOME/tools" ;;
  "tool list") printf 'ruff v0.15.0\\n- ruff\\n' ;;
  "python dir") printf '%s\\n' "$HOME/py" ;;
  "python dir --bin") printf '%s\\n' "$HOME/bin" ;;
  "python list --only-installed --managed-python --output-format json") ${
    UV_PRINTF(
      [
        ...pythons.map((v) => UV_PYTHON(v)),
        ...Object.entries(links).map(([name, v]) =>
          UV_PYTHON(v, name.includes('/') ? `@HOME@/${name}` : `@HOME@/bin/${name}`)
        ),
      ],
    )
  } ;;
  "python list --output-format json") ${
    UV_PRINTF(
      [
        ...downloads.map((v) => UV_PYTHON(v)),
        ...downloads.map((v) => ({ ...UV_PYTHON(v), variant: 'freethreaded' })),
        ...pythons.map((v) => UV_PYTHON(v)),
      ],
    )
  } ;;
  *) exit 0 ;;
esac`
// a tool's venv, made on the python at home
const UV_TOOL = (name: string, home: string) => [
  `mkdir ($env.HOME | path join tools ${name})`,
  `$"home = (${home})\\n" | save ($env.HOME | path join tools ${name} pyvenv.cfg)`,
]

Deno.test('nu / pack / uv is split when a tool runs on a python uv does not manage', async () => {
  const setup = [
    `mkdir ($env.HOME | path join py cpython-3.14-linux-x86_64-gnu bin)`,
    ...UV_TOOL('ruff', `$env.HOME | path join py cpython-3.14-linux-x86_64-gnu bin`),
  ]
  const own = await held({ uv: UV(['3.14.8', '3.13.2']) }, ['uv'], setup)
  if (own == null) {
    return
  }
  assertEquals(own.held.uv, fine('python 3.13, 3.14'))

  const off = (await held({ uv: UV(['3.14.8']) }, ['uv'], [...setup, ...UV_TOOL('hf', `'/usr/bin'`)]))!
  assertEquals(off.held.uv.split, 'a tool runs on a python uv does not manage')
  assertEquals(off.held.uv.detail, ['hf /usr/bin', 'uv tool install --reinstall --managed-python hf'])
})

const uvRun = (stub: string, op: string, names: Array<string>, setup: Array<string> = []) =>
  withStubs(
    { uv: stub },
    [
      ...setup,
      `$env.PACK_OP = '${op}'`,
      `$env.NOOP = '1'`,
      `$env.PACK_MANAGER = 'uv'`,
      `$env.PACK_${op.toUpperCase()}_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
      'packUv',
    ].join('\n'),
    ['uv'],
    ['uv'],
  )
const uvLines = (out: string, text: string) => out.split('\n').filter((l) => l.includes(text)).map((l) => l.trim())
const uvUninstalls = (out: string) => uvLines(out, 'uv python uninstall').map((l) => l.split(' ').at(-2))

// each link in uv's bin dir is a pin, as a ghpm name is: python follows the newest stable python, python3 the newest
// 3, python3.14 the newest 3.14 patch. the tools follow the bare link, and sync lets nothing go: that is tidy's
Deno.test('nu / pack / uv sync moves each python link as far as its pin allows', async () => {
  const downloads = ['3.16.0a1', '3.15.0', '3.14.8', '3.13.2']
  const links = { python: '3.14.8', python3: '3.14.8', 'python3.14': '3.14.8', 'python3.13': '3.13.2' }
  const synced = await uvRun(UV(['3.14.5', '3.14.8', '3.13.2'], downloads, links), 'sync', [])
  if (synced == null) {
    return
  }
  const at = (text: string) => synced.split('\n').findIndex((l) => l.includes(text))
  // one --default moves python and python3 together, onto the newest stable minor rather than the pre-release
  assertEquals(uvLines(synced, 'uv python install').map((l) => l.split(' ').at(-2)), ['3.15'])
  assertEquals(at('uv python upgrade') < at('uv python install --default 3.15'), true)
  assertEquals(
    at('uv python install --default 3.15') < at('uv tool upgrade --all --managed-python --python 3.15'),
    true,
  )
  assertEquals(uvUninstalls(synced), [])

  // already at the newest: the minors move to their newest patches and nothing more comes in
  const current = (await uvRun(UV(['3.15.0'], downloads, { python: '3.15.0', python3: '3.15.0' }), 'sync', []))!
  assertEquals(uvLines(current, 'uv python install'), [])
  assertEquals(current.includes('uv tool upgrade --all --managed-python --python 3.15'), true)

  // a named sync leaves the links alone, and the tools it names move to the minor the bare link has now
  const named = (await uvRun(UV(['3.14.8'], downloads, links), 'sync', ['ruff']))!
  assertEquals(named.includes('python upgrade'), false)
  assertEquals(uvLines(named, 'uv python install'), [])
  assertEquals(named.includes('uv tool upgrade --managed-python --python 3.14 ruff'), true)
})

// --default sets the bare link too, so a pythonX below the newest major moves first and the bare link is set back
// after it. a pythonX with no bare link was taken apart by hand and is left, and a link naming a patch never moves
Deno.test('nu / pack / uv moves a major link without taking the bare link off the newest', async () => {
  const below = await uvRun(
    UV(['4.0.1', '3.14.8'], ['4.0.1', '3.15.0', '3.14.8'], { python: '4.0.1', python4: '4.0.1', python3: '3.14.8' }),
    'sync',
    [],
  )
  if (below == null) {
    return
  }
  assertEquals(uvLines(below, 'uv python install').map((l) => l.split(' ').at(-2)), ['3.15', '4.0'])
  assertEquals(below.includes('uv tool upgrade --all --managed-python --python 4.0'), true)

  const alone = (await uvRun(UV(['3.14.8'], ['3.15.0', '3.14.8'], { python3: '3.14.8' }), 'sync', []))!
  assertEquals(uvLines(alone, 'uv python install'), [])
  assertEquals(alone.includes('uv tool upgrade --all'), true)
  assertEquals(alone.includes('--python'), false)

  const patch = (await uvRun(UV(['3.14.5'], ['3.15.0', '3.14.8'], { 'python3.14.5': '3.14.5' }), 'sync', []))!
  assertEquals(uvLines(patch, 'uv python install'), [])
})

// tidy lets a python go once nothing links to it, as ghpm lets go of a release no pin is on: a link in uv's bin dir
// keeps one, a minor's own link in uv's python dir keeps one, and an old minor that still has a link is uv's to drop
Deno.test('nu / pack / uv tidy lets go of every python nothing links to', async () => {
  const pythons = ['3.16.0a1', '3.15.0', '3.14.5', '3.14.8', '3.13.0', '3.13.2']
  const links = {
    python: '3.15.0',
    python3: '3.15.0',
    'python3.15': '3.15.0',
    'python3.14': '3.14.8',
    'py/cpython-3.13-linux-x86_64-gnu/bin/python3.13': '3.13.2',
  }
  const tidied = await uvRun(UV(pythons, [], links), 'tidy', [])
  if (tidied == null) {
    return
  }
  assertEquals(uvUninstalls(tidied), [
    'cpython-3.16.0a1-linux-x86_64-gnu',
    'cpython-3.14.5-linux-x86_64-gnu',
    'cpython-3.13.0-linux-x86_64-gnu',
  ])
  assertEquals(tidied.includes('uv cache clean'), true)
  assertEquals((await uvRun(UV(['3.14.8']), 'add', ['ruff']))!.includes('uv tool install --managed-python ruff'), true)
})

// bun links a package's own command into its bin dir, and one that starts `#!/usr/bin/env node` runs on whichever
// node PATH finds, not on bun
Deno.test('nu / pack / bun is split when a package it holds runs on node', async () => {
  const link = (pkg: string, bin: string, shebang: string) => [
    `mkdir ($env.HOME | path join .bun install global node_modules ${pkg} bin)`,
    `'${shebang}\nconsole.log(1)\n' | save ($env.HOME | path join .bun install global node_modules ${pkg} bin ${bin}.js)`,
    `mkdir ($env.HOME | path join .bun bin)`,
    `^ln -s ($env.HOME | path join .bun install global node_modules ${pkg} bin ${bin}.js) ($env.HOME | path join .bun bin ${bin})`,
  ]
  const ln = new Deno.Command('sh', { args: ['-c', 'command -v ln'], stdout: 'piped' }).outputSync()
  if (!ln.success) {
    return
  }
  // bun's root is the test home's ~/.bun, never one the machine running the tests points it at
  const path = [`$env.PATH = ($env.PATH | append ['/usr/bin' '/bin'])`, 'hide-env -i BUN_INSTALL XDG_CACHE_HOME']
  const fineBun = await held({ bun: '' }, ['bun'], [...path, ...link('tsx-like', 'own', '#!/usr/bin/env bun')])
  if (fineBun == null) {
    return
  }
  assertEquals(fineBun.held.bun, fine(''))
  // nothing installed globally yet: no bin dir to read, and nothing to say
  assertEquals((await held({ bun: '' }, ['bun']))!.held.bun, fine(''))

  const onNode = (await held({ bun: '' }, ['bun'], [
    ...path,
    ...link('semver', 'semver', '#!/usr/bin/env node'),
    ...link('@scope/tool', 'tool', '#!/usr/bin/env node'),
  ]))!
  assertEquals(onNode.held.bun.split, 'packages run on node, not bun')
  assertEquals(onNode.held.bun.detail, [
    '@scope/tool semver',
    'bun remove --global @scope/tool semver',
    'pnpm add --global @scope/tool semver',
  ])
})

// npm comes with the node it runs on, a distro's or the tarball's, and installs into a prefix in the user's home
const NPM = (prefix: string) =>
  `case "$*" in
  "prefix --global") printf '%s\\n' "${prefix}" ;;
  "ls --global --depth 0 --parseable") printf '%s\\n' "${prefix}/lib" "${prefix}/lib/node_modules/semver" "${prefix}/lib/node_modules/@scope/tool" ;;
  *) exit 0 ;;
esac`
const NODE_24 = `printf 'v24.11.0\\n'`
const npmBin = [`$env.PATH = ($env.PATH | append ($env.HOME | path join .local bin))`]

Deno.test('nu / pack / npm is one install with its node, and installs into a prefix in your home', async () => {
  const own = await held({ npm: NPM('$HOME/.local'), node: NODE_24 }, ['npm'], npmBin)
  if (own == null) {
    return
  }
  assertEquals(own.held.npm, fine('node 24.11.0'))
  assertEquals(own.said, ['npm prefix --global', 'node --version'])

  const system = (await held({ npm: NPM('/usr'), node: NODE_24 }, ['npm'], npmBin))!
  assertEquals(system.held.npm.split, "npm's global prefix is outside your home")
  assertEquals(system.held.npm.detail, ['/usr', 'npm config set prefix ~/.local'])

  // its packages start `env node`, so another node ahead on PATH is the one they would run on
  const apart = (await held({ '~/other/node': NODE_24, npm: NPM('$HOME/.local'), node: NODE_24 }, ['npm'], npmBin))!
  assertEquals(apart.held.npm.split, 'its packages run on another node')
  const alone = (await held({ '~/other/node': NODE_24, npm: NPM('$HOME/.local') }, ['npm'], npmBin))!
  assertEquals(alone.held.npm.split, 'no node beside npm')
  const offPath = (await held({ npm: NPM('$HOME/.local'), node: NODE_24 }, ['npm']))!
  assertEquals(offPath.held.npm.split, "npm's bin dir is not on PATH")
})

// the npm pnpm holds keeps its global prefix inside pnpm's own node: it is a pnpm package, never a manager of its own
Deno.test("nu / pack / pnpm's npm is not a manager", async () => {
  const marked = `touch ($env.PATH | last | path join .pnpm-shim-v1-npm-target)`
  const here = (setup: Array<string>) =>
    withStubs(
      { npm: NPM('$HOME/.local'), pnpm: PNPM(['node', 'npm']) },
      [
        ...setup,
        'print (packManagersHere | str join " ")',
      ].join('\n'),
      ['pnpm', 'npm'],
      ['npm'],
    )
  const plain = await here([])
  if (plain == null) {
    return
  }
  assertEquals(plain, 'pnpm npm')
  assertEquals(await here([marked]), 'pnpm')
})

Deno.test('nu / pack / npm reads what it holds from its parseable listing', async () => {
  const out = await withStubs(
    { npm: NPM('$HOME/.local') },
    `print (packNpmInstalled | str join ' ')`,
    ['npm'],
    ['npm'],
  )
  if (out == null) {
    return
  }
  assertEquals(out.split('\n').at(-1), 'semver @scope/tool')
})

// every copy of a manager is a row, and a row runs its manager with that copy's dir first on PATH: what it reaches for
// by name is its own install's, and nothing it runs is another copy's
Deno.test('nu / pack / the copy kept runs inside itself, though PATH finds another first', async () => {
  const out = await withStubs(
    { go: '', '~/.gotm/bin/go': '' },
    [
      `$env.PATH = ($env.PATH | reverse)`,
      `def --env packGoHeld [] { packHeld $"go \\((which go | get 0.path | path dirname | path basename))" }`,
      `def --env packGo [] { print $"ran (which go | get 0.path)" }`,
      `hide-env SUCCINCT`,
      `$env.PACK_OP = 'sync'`,
      'packManagerPlanRun',
    ].join('\n'),
    ['go'],
    [],
    false,
    [1],
  )
  if (out == null) {
    return
  }
  const lines = stripVTControlCharacters(out).split('\n')
  assertEquals(lines.filter((l) => /^\d\) go\s/.test(l)).length, 1)
  const ran = lines.filter((l) => l.startsWith('ran ')).map((l) => l.slice(4))
  assertEquals(ran.length, 1)
  assertEquals(ran[0].endsWith('/.gotm/bin/go'), true)
})

// a pnpm 10 and a pnpm 12 keep separate global dirs, so a remove asks each copy what it holds and only the one that has
// the name takes it out. both are in the home, and the one ahead on PATH is the plain name
Deno.test('nu / pack / a name is claimed by the copy that holds it', async () => {
  const claims = async (name: string) => {
    const out = await withStubs(
      { '~/old/bin/pnpm': PNPM(['ten']), '~/new/bin/pnpm': PNPM(['node', 'twelve']), node: NODE },
      [`$env.PACK_OP = 'remove'`, `print (packClaimsAll (packManagersHere) '${name}' | to json --raw)`].join('\n'),
      ['pnpm'],
    )
    return out == null ? null : JSON.parse(out.split('\n').at(-1)!)
  }
  const ten = await claims('ten')
  if (ten == null) {
    return
  }
  assertEquals(ten, ['pnpm'])
  const twelve = (await claims('twelve'))!
  assertEquals(twelve.length, 1)
  assertEquals(/^pnpm@\//.test(twelve[0]), true)
})

// copies are the best kind of install there is, as add prefers the most portable manager: one in the home over one a
// native manager keeps in its own tree (scoop's here), and either over the system's, which is used only alone
Deno.test('nu / pack / the copies used are the best kind of install here', async () => {
  const dirs = async (stubs: Record<string, string>) => {
    const out = await withStubs(stubs, `print (packCopies 'dotnet' | each { |id| packCopyAt $id } | to json --raw)`, [
      'dotnet',
    ])
    return out == null ? null : (JSON.parse(out.split('\n').at(-1)!) as Array<string>)
  }
  const all = await dirs({ '~/dn/dotnet': '', '~/scoop/shims/dotnet': '', dotnet: '' })
  if (all == null) {
    return
  }
  assertEquals(all.length, 1)
  assertEquals(all[0].endsWith('/dn'), true)
  const native = (await dirs({ '~/scoop/shims/dotnet': '', dotnet: '' }))!
  assertEquals(native.length, 1)
  assertEquals(native[0].endsWith('/scoop/shims'), true)
  const system = (await dirs({ dotnet: '' }))!
  assertEquals(system.length, 1)
  assertEquals(system[0].includes('/scoop/') || system[0].endsWith('/dn'), false)
  // two of the best kind are both used, in PATH order
  assertEquals((await dirs({ '~/a/dotnet': '', '~/b/dotnet': '', dotnet: '' }))!.map((d) => d.split('/').at(-1)), [
    'a',
    'b',
  ])
})

// every cargo installs into ~/.cargo, so a second copy holds nothing the first does not: a listing or a remove asks
// one, while sync and add still reach both, one at a time, each doing what its own toolchain calls for
Deno.test('nu / pack / copies that share a package home are asked once, but each is synced', async () => {
  const here = async (op: string) => {
    const out = await withStubs(
      { '~/other/bin/cargo': '', '~/.cargo/bin/cargo': '' },
      [`$env.PACK_OP = '${op}'`, `print (packManagersHere | where { |id| (packCopyBase $id) == 'cargo' } | length)`]
        .join('\n'),
      ['cargo'],
    )
    return out == null ? null : Number(out.split('\n').at(-1))
  }
  const remove = await here('remove')
  if (remove == null) {
    return
  }
  assertEquals(remove, 1)
  assertEquals(await here('list'), 1)
  assertEquals(await here('sync'), 2)
  assertEquals(await here('add'), 2)
})

// a command the os will not start answers as a failed one with no exit code, so the manager it belongs to is skipped
// or listed as empty rather than ending the run
Deno.test('nu / pack / a command that cannot start answers rather than throws', async () => {
  const out = await withStubs(
    {},
    [`print (packComplete ['/no/such/dir/cargo' 'install' '--list'] | to json --raw)`].join('\n'),
    [],
  )
  if (out == null) {
    return
  }
  const res = JSON.parse(out.split('\n').at(-1)!)
  assertEquals(res.exit_code, null)
  assertEquals(res.stdout, '')
  assertEquals(res.stderr.length > 0, true)
})

// a bun or deno install runs on whichever bun or deno PATH finds first. the copy in the home is the one used, and a
// system one beside it is left alone; but where PATH finds that one first, the copy used is updating what it runs
Deno.test('nu / pack / a bun or deno is split when its packages run on another copy', async () => {
  const ln = new Deno.Command('sh', { args: ['-c', 'command -v ln'], stdout: 'piped' }).outputSync()
  if (!ln.success) {
    return
  }
  const bunSetup = (reversed: boolean) => [
    ...(reversed ? [`$env.PATH = ($env.PATH | reverse)`] : []),
    `$env.PATH = ($env.PATH | append ['/usr/bin' '/bin'])`,
    'hide-env -i BUN_INSTALL XDG_CACHE_HOME',
    `mkdir ($env.HOME | path join .bun install global node_modules tool bin) ($env.HOME | path join .bun bin)`,
    `'#!/usr/bin/env bun' | save ($env.HOME | path join .bun install global node_modules tool bin tool.js)`,
    `^ln -s ($env.HOME | path join .bun install global node_modules tool bin tool.js) ($env.HOME | path join .bun bin tool)`,
  ]
  const bun = await held({ '~/first/bun': '', bun: '' }, ['bun'], bunSetup(false))
  if (bun == null) {
    return
  }
  // the other bun is not a row, and nothing is said about it
  assertEquals(bun.held, { bun: fine('') })
  assertEquals(bun.said.some((l) => l.includes('skipped')), false)
  const shadowed = (await held({ '~/first/bun': '', bun: '' }, ['bun'], bunSetup(true)))!
  assertEquals(Object.keys(shadowed.held), ['bun'])
  assertEquals(shadowed.held.bun.split, 'its packages run on another bun')
  assertEquals(shadowed.said[0], 'bun skipped: its packages run on another bun')

  const denoSetup = [`mkdir ($env.HOME | path join .deno bin .tool)`]
  const deno = (await held({ '~/first/deno': '', deno: '' }, ['deno'], denoSetup))!
  assertEquals(deno.held, { deno: fine('') })
  const denoShadowed = (await held({ '~/first/deno': '', deno: '' }, ['deno'], [
    `$env.PATH = ($env.PATH | reverse)`,
    ...denoSetup,
  ]))!
  assertEquals(Object.keys(denoShadowed.held), ['deno'])
  assertEquals(denoShadowed.held.deno.split, 'its installs run on another deno')
})

// a dotnet tool finds its runtime through DOTNET_ROOT, and with it unset, through the system's dotnet location
const DOTNET = `case "$*" in
  "--version") printf '10.0.402\\n' ;;
  "tool list --global --format json") printf '%s' '{"version":1,"data":[{"packageId":"dotnetsay","version":"3.0.3","commands":["dotnetsay"]}]}' ;;
  *) exit 0 ;;
esac`
const dotnetTools = [
  `$env.PATH = ($env.PATH | append ($env.HOME | path join .dotnet tools))`,
  'hide-env -i DOTNET_ROOT',
]

Deno.test('nu / pack / dotnet is one install with its tools when DOTNET_ROOT names it', async () => {
  const system = await held({ dotnet: DOTNET }, ['dotnet'], dotnetTools)
  if (system == null) {
    return
  }
  assertEquals(system.held.dotnet, fine('sdk 10.0.402'))
  assertEquals(system.said, ['dotnet --version'])

  // a dotnet under the home that DOTNET_ROOT does not name: its tools would run on the system's
  const local = (await held({ '~/dn/dotnet': DOTNET }, ['dotnet'], dotnetTools))!
  assertEquals(local.held.dotnet.split, "DOTNET_ROOT is not set, so its tools run on the system's dotnet")
  assertEquals(/^DOTNET_ROOT=\/.+\/dn$/.test(local.held.dotnet.detail[0]), true)
  const named = (await held({ '~/dn/dotnet': DOTNET }, ['dotnet'], [
    ...dotnetTools,
    `$env.DOTNET_ROOT = ($env.HOME | path join dn)`,
  ]))!
  assertEquals(named.held.dotnet, fine('sdk 10.0.402'))
  const other = (await held({ dotnet: DOTNET }, ['dotnet'], [...dotnetTools, `$env.DOTNET_ROOT = '/opt/dotnet'`]))!
  assertEquals(other.held.dotnet.split, "DOTNET_ROOT is another install's")
  // its tools dir off PATH matters once it holds a tool, and not before
  assertEquals(
    (await held({ dotnet: DOTNET }, ['dotnet'], ['hide-env -i DOTNET_ROOT']))!.held.dotnet,
    fine('sdk 10.0.402'),
  )
  const offPath = (await held({ dotnet: DOTNET }, ['dotnet'], [
    'hide-env -i DOTNET_ROOT',
    `mkdir ($env.HOME | path join .dotnet tools .store dotnetsay)`,
  ]))!
  assertEquals(offPath.held.dotnet.split, "dotnet's tools dir is not on PATH")

  // a second dotnet, a system install ahead on PATH, is not used where one in the home is: it is left alone, unchecked
  // and unsaid, and the one DOTNET_ROOT names is the row, asked inside its own dir
  const beside = (await held({ '~/dn/dotnet': DOTNET, dotnet: DOTNET.replace('10.0.402', '6.0.428') }, ['dotnet'], [
    `$env.PATH = ($env.PATH | reverse)`,
    ...dotnetTools,
    `$env.DOTNET_ROOT = ($env.HOME | path join dn)`,
  ]))!
  assertEquals(beside.held, { dotnet: fine('sdk 10.0.402') })
  assertEquals(beside.said, ['dotnet --version'])

  const listed = await withStubs({ dotnet: DOTNET }, `print (packDotnetInstalled | str join ' ')`, ['dotnet'], [
    'dotnet',
  ])
  assertEquals(listed!.split('\n').at(-1), 'dotnetsay')
})

// rv keeps every version of a tool side by side and runs the newest through rvx, so a sync puts each tool back at its
// latest alone
// a ruby install says where it was asked from, since a project's pin there would answer before the home dir's
const RV = (tools: Array<[string, string]>, rubies: Array<string> = ['ruby-4.0.7']) =>
  `case "$*" in
  "tool list --format json") printf '%s' '${
    JSON.stringify(tools.map(([gem_name, version]) => ({ gem_name, version })))
  }' ;;
  "ruby list --installed-only --format json") printf '%s' '${
    JSON.stringify(rubies.map((version) => ({ Installed: { version }, active: true })))
  }' ;;
  "ruby install") if [ "$PWD" = "$HOME" ]; then printf 'asked from home\\n'; fi ;;
  *) exit 0 ;;
esac`

Deno.test('nu / pack / rv runs its tools through rvx, on its own ruby', async () => {
  const own = await held({ rv: RV([]), rvx: '' }, ['rv'])
  if (own == null) {
    return
  }
  assertEquals(own.held.rv, fine('ruby 4.0.7'))
  assertEquals((await held({ rv: RV([]) }, ['rv']))!.held.rv.split, 'no rvx beside rv, so its tools cannot run')
})

Deno.test('nu / pack / rv puts a tool back at its latest alone', async () => {
  const run = (tools: Array<[string, string]>, names: Array<string>, rubies?: Array<string>) =>
    withStubs(
      { rv: RV(tools, rubies), rvx: '' },
      [
        `$env.PACK_OP = 'sync'`,
        `$env.PACK_MANAGER = 'rv'`,
        `$env.PACK_SYNC_NAMES = ${JSON.stringify(names).replaceAll('"', "'")}`,
        'packRv',
      ].join('\n'),
      ['rv'],
      ['rv'],
    )
  const ops = (out: string) =>
    out.split('\n').filter((l) => /rv (ruby|tool) (install|uninstall)/.test(l)).map((l) => l.trim())
  const twice = await run([['lolcat', '100.0.1'], ['lolcat', '99.9.21'], ['rerun', '0.14.0']], [])
  if (twice == null) {
    return
  }
  // the ruby moves first, along the home dir's pin or to the newest, as rv reads it from home
  assertEquals(ops(twice).map((l) => l.replace(/^try \{ | \}$/g, '')), [
    'rv ruby install',
    'rv tool install lolcat',
    'rv tool install rerun',
    'rv tool uninstall lolcat',
    'rv tool install lolcat',
  ])
  assertEquals(twice.includes('asked from home'), true)
  // a named sync is about the tool it names, and a machine with no ruby of rv's is not given one
  const named = (await run([['rerun', '0.14.0']], ['rerun']))!
  assertEquals(ops(named).map((l) => l.replace(/^try \{ | \}$/g, '')), ['rv tool install rerun'])
  assertEquals((await run([['rerun', '0.14.0']], [], []))!.includes('rv ruby install'), false)
})
