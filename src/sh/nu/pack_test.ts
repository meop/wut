import { assertEquals } from '@std/assert'

import { runNu } from '../../_test.ts'
import { getScriptFlavorOpPreamble } from '../../sh.ts'

const PACK_NU = new URL('./pack.nu', import.meta.url).pathname
const SEL_NU = new URL('./sel.nu', import.meta.url).pathname
const PATH_NU = new URL('./path.nu', import.meta.url).pathname

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
      await Deno.readTextFile(PATH_NU),
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
    return await runNu(body, allowFailure)
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

// sync is WIDE where remove is PINPOINT: a name two managers both hold is stale in one of them if only the first
// in preference order is updated, while uninstalling from both is a different thing than was asked for
Deno.test('nu / pack / sync updates every manager holding a name, remove only the one it takes it from', async () => {
  const stubs = { ghpm: LISTINGS.ghpm, uv: LISTINGS.uv }
  const probe = (op: string) =>
    [
      `$env.PACK_OP = '${op}'`,
      `print (packFindEvery (packManagersHere) 'hf' | str join ' ')`,
    ].join('\n')
  const both = await withStubs(
    { ghpm: `case "$*" in\n  "list --long-names") printf 'hf\\n' ;;\n  *) exit 1 ;;\nesac`, uv: stubs.uv },
    probe('sync'),
    ['ghpm', 'uv'],
  )
  if (both == null) {
    return
  }
  assertEquals(both, 'ghpm uv')
  assertEquals(
    await withStubs(
      { ghpm: `case "$*" in\n  "list --long-names") printf 'hf\\n' ;;\n  *) exit 1 ;;\nesac`, uv: stubs.uv },
      probe('remove'),
      ['ghpm', 'uv'],
    ),
    'ghpm',
  )
})

// a group states which managers can serve it, never which one did, so a sync of a group nothing here holds has the
// same answer a loose name does: nothing to do, said once
Deno.test('nu / pack / syncing a group no manager holds says so rather than picking one', async () => {
  const unit = JSON.stringify({
    group: 'media-vlc',
    name: 'vlc',
    paths: [
      { id: 'media-vlc|ghpm', manager: 'ghpm', names: ['vlc'] },
      { id: 'media-vlc|uv', manager: 'uv', names: ['vlc'] },
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

// a tool its own installer put down updates itself by that path, and it is best effort: one that refuses — built
// without self update, turned off, owned by something else — says so, and the rest of the sync still runs
Deno.test('nu / pack / standalone installs update themselves, and a refusal does not stop the run', async () => {
  const self = [
    { group: 'lang-yes', path: '{HOME}/.yes/bin/yes', args: ['self', 'update'] },
    { group: 'lang-no', path: '{HOME}/.no/bin/no', args: ['upgrade'] },
    { group: 'lang-absent', path: '{HOME}/.absent/bin/absent', args: ['upgrade'] },
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
  assertEquals(out.includes('lang-no did not update itself'), true)
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
    { group: 'ai-code-codex', path: '{HOME}/.local/bin/codex', args: ['update'] },
    { group: 'sys-manager-ghpm', path: '{HOME}/.ghpm/bin/ghpm', args: ['upgrade'] },
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
    group: 'lang-rust-rustup',
    name: 'rustup',
    paths: [{ id: 'lang-rust-rustup|pacman', manager: 'pacman', names: ['rustup'] }],
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
      `  if $id == 'lang-rust-rustup|pacman' {`,
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
