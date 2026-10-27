# Pack: groups, plans, and one decision

How `pack add` and `pack remove` decide what to do, and when they ask.

## What a group yaml is for

A group exists to state something the client cannot work out for itself:

- **a naming difference between platforms** — `nu` on ghpm and cargo, `nushell` on pacman
- **companions that ship separately** — `nodejs` plus `npm` on pacman, one package on brew
- **something to run instead of a package install** — the `script` tier
- **membership** — a group whose contents are other groups
- **a place in a folder** — an optional companion of the group above it, or a tool of the same kind as its neighbours,
  found and combined through that folder: `desktop/tool/remote/remmina/freerdp`

## Every entry is the same thing

`add` runs one entry of a group, the first manager present in `GROUP_ORDER`, so a group is one thing, and each manager's
entry is that thing in its own names. An entry that holds more or less than the others makes the same `wut p a` install
something different on each machine, and nothing says so. Where one platform ships a companion inside the thing's own
package, the group is the two together and every other entry lists both: brew's `node` carries npm, so pacman's entry is
`nodejs` and `npm`. Where none does, a companion worth picking or leaving on its own — a plugin, a client beside a
server, a tool that goes with another — is a group of its own in the folder of the one it goes with, a row of its own:
`editor/nvim/pynvim`, `lang/go/golangci-lint`. A group also installs through one manager per machine, so two things one
platform takes from different managers, one from winget and another from scoop, are two groups, even where another
platform could keep them together. A group that is a whole setup by design, the same setup on every platform it names,
is one thing too: `desktop/gnome`.

## An entry can be gated

A manager's entry takes a `gate`, with the same `sys_*` conditions a script's does. Where it fails, the group has no
entry for that manager on this machine, and the next manager in `GROUP_ORDER` is the one reached.

## Drop-ins

A group's names can differ by more than the manager: debian and ubuntu both use apt. A drop-in is a file beside the
group, named for it with levels after a dot, `<group>.<plat>[.<os>[.<arch>]]`, holding the same shape as the group.
Wherever its levels match the machine (`sys_os_plat`, then `sys_os`, then `sys_cpu_arch`), it is merged into the group,
broadest first: lists combine, maps merge key by key, and a single value the group already sets otherwise is an error. A
drop-in is never a group of its own, so nothing lists it, and the common names stay in the group.

## Finding

`pack find` is how something half remembered becomes a name to type, so it asks the wider of the two questions in
[COMMANDS.md](COMMANDS.md): the term starts a word of a group's name, of an alias, of a package any manager declares for
it, or of its `descr`. `wut p f tightvnc` finds the group that holds `glavsoft.tightvnc`, `wut p f containerd` the group
containerd.io is part of, and `wut p f shell` everything whose description mentions one. What it prints is the group and
its packages, which are the names `add` takes.

`add`, `remove`, `sync` and `info` ask the narrower one (Resolving, below), so find matching a group does not mean the
same term adds it — that is the point of looking first. A name no group is found by is not dropped; it becomes a
**remaining** name, searched for in real managers after the gate, the same way add checks a loose one. The managers are
only ever asked about what the config had no answer for.

Matching and applicability are separate questions: the first is about the name you typed, the second about the machine
you are on. Applicability is answered in two places, because neither side knows both halves:

- **server** — does this platform have a manager the group names, or is its script gated in. `p f llm` lists the llm
  groups on arch and nothing on fedora, since none of them declares a dnf entry.
- **client** — is one of those candidates really on this PATH. `packFindWinner` picks the first one that is, in the
  order the server sent (`GROUP_ORDER`) — the same rule `packPickPath` uses for add.

`packFindShow` prints what matched — manager, then group, then the package name (or the script's rel file path) — and
that is the whole of it when every typed name was claimed. A name no group claimed is the only thing find cannot answer
on its own, so the server emits `packFindSearch` too: it lists the unclaimed names under `?`, tables the managers it
would ask, and searches only the ones picked. Nothing to search for means no table and no question.

## Resolving

1. Each cli name resolves to groups via `resolveGroupName`, and has to be a name the group goes by, whole: a run of
   levels of its own path (`claude`, `agent/claude` and `ai/agent/claude` are all `ai/agent/claude.yaml`), a folder
   above it (`ai` is every group under `lang/`), or one of its aliases. Part of a name is not a name, and neither is a
   package the group holds — `containerd.io` does not reach `virt/docker`, since adding the group would install
   everything else in it. A shorter or a second spelling a group should answer to is an alias, stated in its yaml. A
   name matching no group is a **loose name**, handed to the managers as typed. `remove` resolves exactly as `add` does
   and takes every group that matches, each a row to pick from.
2. A group's `group` tier lists other groups (or loose names). The walk is iterative over a stack with a visited set of
   resolved group names, so a cycle stops and a diamond resolves once.
3. Preference is one fixed order, not the yaml's: the user managers, then a group's `script`, then the system's
   ([RULES.md](RULES.md)). A group's flat `manager` map says which of them can serve it, in any order.

## Planning, client side

The server cannot know which managers exist on the machine, so it emits resolved data and the client builds the plan.

- **Group rows** need no search when adding. The winner is the first manager that exists here, in that order, with names
  for this group. The yaml already stated what works; there is nothing to verify.
- **Loose rows** need a search, because nothing has stated anything. Every manager is asked, not just until one claims
  the name: the first in wut's order is not always the one wanted (ghpm has a github repo's release binary, go builds
  the same tool from source). A name one manager claims goes there; when any name has several, each name under each
  manager that claims it is a row of a second numbered pick (`packSearchPick`), and a name goes to the first row picked
  for it. `-y` picks every row, which is wut's order again.
- A group with no manager on this machine is **config rot**: it blocks the run. Nothing installs, the row says so, and
  one yaml edit fixes it.
- A loose name nothing can serve is a **typo**: it shows as unservable and the rest of the plan proceeds.

## Add and remove ask different questions

Both walk the managers in the same preference order, but they are not asking the same thing, and reading a name's fate
off the wrong question is how a plan ends up naming a manager that has nothing to do:

|                | The question             | Answered by     | Costs                    |
| -------------- | ------------------------ | --------------- | ------------------------ |
| `add`          | who **could** serve this | `packExists`    | a registry round trip    |
| `remove`       | who **already has** this | `packInstalled` | a local listing or query |
| `sync <names>` | who **already has** this | `packInstalled` | a local listing or query |

A named sync asks remove's question with a different verb — updating a package is something only the manager holding it
can do — so `packOpAsksInstalled` is what the walk reads, not the op name. Handing the name to every manager instead is
how `wut p s vlc` came to offer eight managers and run an upgrade against seven that had never heard of vlc. Both offer
every manager holding the name as its own row, and the pick decides which run: a name two managers hold is not settled
by whichever sorts first, which for sync left it stale in the second and for remove took it out of the one you did not
mean. A group's paths work the same way (`packPickPaths`). A bare `sync` has no name to place and keeps the plainer
manager-only plan.

### Sync never installs

Picking the right managers is not enough on its own, because several of these update commands install a name they do not
find: `deno install --force --global vlc@latest` is deno's update _and_ its install, and `pacman --sync --needed` and
`choco upgrade` behave the same way. That is how the vlc run ended with vlc installed under deno. So the guard is stated
once, in `packSyncNames`, rather than trusted to fifteen commands: the names a manager is handed are narrowed to the
ones it actually holds, and a manager left with none runs nothing — never the whole-manager upgrade, which is what _no
names at all_ means. Wanting a package that is not here is `add`; sync only ever updates what is.

A name can be available everywhere and installed in exactly one place. `git-filter-repo` is on pypi, on npm and on
github, so every user manager could serve it — but uv is the one holding it, and only uv can let it go. Asking
availability on the way to an uninstall picks whichever manager sorts first and runs a command against a manager that
never had the package.

That difference decides where the work sits relative to the gate, too. `packExists` reaches the network, so add's loose
names stay behind `?` until something is picked — see [OPS.md](OPS.md#an-op-asks-when-work-follows-the-answer).
`packInstalled` reads what is already on the machine, so remove and a named sync run it **before** the table and state
the winner by name. Neither has a `?` row: by the time they ask, there is nothing left to find out.

The same split applies one level up, to group rows, in `packPickPaths`. A group states which managers _can_ serve it,
never which one did, so removing walks the same order and takes the first whose declared names are actually installed,
and syncing takes every one of them. A group nothing holds is already gone — it is dropped rather than acted on through
a manager that is merely present, and the cli name it came from falls through like any unclaimed name.

Each manager states what it holds **once**. `list` dumps it and the checks read it, and two statements of the same fact
is how `list` and `remove` came to disagree about a name. deno has no listing command at all — its global installs are
shim directories, and the dot-prefixed metadata directory beside each shim is the only record that a shim is an install
— so `packDenoInstalled` reads the directory. pnpm has two forms of one command and needs the second: `--parseable`
prints one full path per line, which spells a scoped name whole where the drawn tree's `name@version` tokens do not, so
every check reads that and the tree stays the dump.

Each manager answers the installed question the exact way it can: a query that succeeds or fails by exit code where one
exists (`pacman --query`, `brew list --versions`, `dpkg-query`, `rpm --query`), and its own listing parsed to entry
names where none does (`uv tool list`, `cargo install --list`, `ghpm list --long-names`). Parsing matters more than it
looks: these listings hang detail off their entries — uv restates each tool as `- name` beneath it, cargo indents the
binaries a crate installs — and reading that detail as an entry is how a check starts agreeing with everything. deno and
go have no listing command at all. deno keeps a shim per install in its bin dir, and go keeps the one binary it built,
which names the package and module it came from (`go version -m`) — so both answer by reading their bin dir. The user
managers run from the furthest from the system to the closest — js, then python, then go, then cargo, whose rust tools
are the nearest kin of what a system installer ships — and all of them ahead of the system installers, whose tools are
older. `src/sh/nu/pack_test.ts` pins those formats against stub managers.

## One decision

The plan is a summary of what each manager would do, then one numbered row per thing to pick, and the numbers are the
decision:

```
pacman
  shell/zsh
    zsh, zsh-completions
ghpm
  lang/go
    gotm
    then: gotm/setup
  lang/go/golangci-lint
    golangci-lint
  bat, fd

manager   group                 package
-------   -----                 -------
1) pacman shell/zsh
2) ghpm   lang/go
3) ghpm   lang/go/golangci-lint
4) ghpm                         bat
5) ghpm                         fd
6) ?                            lazygit

enter number(s) [empty=all] (0=quit | 1[,][-]6):
```

Empty takes every row, `0` quits, and anything else is a selection in ghpm's syntax — `1 3`, `1,3`, `1-3`, or a mix. The
summary is where what a row carries is listed — a group's packages and its `first:` and `then:` scripts — and the table
never repeats it as a list, so a row stays one line however big the group ([OPS.md](OPS.md#filter-summarise-ask-once)).

A row is a group rather than a manager because a folder brings its groups along: `wut p a go` is the toolchain in
`lang/go.yaml` and golangci-lint in `lang/go/golangci-lint.yaml`, both served by ghpm, and a row per manager could only
take both or neither. A group's own packages are never split further — it states they go together, and a package wanted
on its own is a group of its own. Each loose name is its own row, since nothing ties it to another, and so is each `?`
name, add's names still to be searched for: picking one is picking that search. When add's search finds a name under
several managers, the second pick is the same shape, a row per manager and name, and each name goes to the first row
picked for it.

Selecting rather than confirming is how a run is narrowed. A yes/no gate could only accept or reject the whole plan, so
narrowing it would mean cancelling, re-typing the command, and re-reading the same table. The list already had to be
built and shown; letting it be answered is the same table doing one more job.

There are no per-manager prompts of wut's either — a prompt was never a veto, it was "here is what wut decided, do you
agree", and asking it seven times only obscured that. wut asks nothing after the pick, so `-y` is exact and takes
everything, and `wutSelectRead` is the single place `-y` is read. The per-manager confirms are deleted rather than
guarded: a check that can never fire reads like a safety net and holds nothing.

wut gates only itself. `-y` answers wut's question and goes no further: it is never turned into a manager's own flag
(`--noconfirm`, `--yes`, `--assumeyes`, `--accept-package-agreements`). What a tool asks while it runs — pacman's
`[Y/n]` before a sysupgrade, apt's before an install — is between the user and that tool, and is answered at the
terminal as if the tool had been run by hand.

The server emits the plan as data (`PACK_PLAN`) and the bodies behind ids in a generated `packRunUnit`, so code stays
code and the plan stays data. The client picks each group's winner and resolves loose names with an exact per-manager
check — `packExists` when adding, `packInstalled` when removing. Refreshes run before add's checks so the answers are
current; remove refreshes nothing, since a remote index has no bearing on what is already here. `find`'s remaining names
resolve the way add's do, every manager asked (`packClaimsAll`), just after its own gate rather than add's, and each is
listed under every manager that has it. They answer to a `?` row so they can be taken or left like any manager.

`tidy`, `info` and a bare `sync` have no per-package decision to make — the only question is which managers this run
touches — so they share a plainer plan, `packManagerPlanRun`, whose rows are just the managers present. A `sync` given
names does have that decision, and takes the same plan `add` and `remove` do.

`list` and `outdated` given a term share `packTermPlanRun`: both filter what is installed, and a package has to be
installed before it can be out of date, so the same local listing answers which managers have anything matching. Bare,
they fall through to the manager-only plan, since there is nothing cheaper than running the managers themselves.

## A name may have a slash of its own

jsr names always carry a scope (`@std/path`), npm's may (`@scope/pkg`), a brew tap or a scoop bucket can qualify a name
(`user/tap/formula`, `extras/vscode`), and a go tool is named by its package path (`golang.org/x/tools/gopls`). The
client sends each argument as one path segment, so the `wut` function percent encodes each argument whole — nu's
`url encode --all`, pwsh's `[uri]::EscapeDataString`, and in zsh curl's own `--variable` `:url` function (curl 8.3+),
since zsh has none — and the server decodes each segment after splitting the path. Encoding only the characters that
split a segment is not enough: a url treats `\` as `/`, curl and nu refuse a raw space, and curl expands `[]` and `{}`
as patterns, so `pkg[extra]` would never be sent. A group yaml spells such names as they are, since they never travel in
the url.

## Group first, then the name as typed

`add`, `remove`, `sync` and `find` all resolve a typed name through its group before doing anything with it, and let a
name no group claims fall through as itself. `info` now does the same: it asks every manager rather than picking one, so
it has no plan to pick from, but a group still knows what each manager calls the thing — asking pacman about `nu` when
the group says `nushell` is asking about nothing. The server emits `PACK_INFO_MAP`, each manager's own names for the
groups that were typed, and `packInfoNames` hands a manager its declared names plus whatever no group claimed, asked as
typed. With nothing unclaimed, a manager the groups never named has no question to put, so it is not offered.

## Global, wherever wut was run from

deno, bun, pnpm, uv and cargo all manage packages twice over — a project's and the machine's — and wut only ever means
the machine's. Most of them say so with a flag (`--global`, `uv tool`, `cargo install`), which is the tool doing this
itself: locate the global project, act there, come back. The ops that have no such flag decide what they mean by looking
for a project file in the cwd, which makes the answer depend on where you were standing when you ran wut:

| Command             | Standing outside a project | Standing inside one                           |
| ------------------- | -------------------------- | --------------------------------------------- |
| `deno info npm:<x>` | answers                    | errors on the project's `nodeModules` setting |
| `bun info <x>`      | errors, no package.json    | answers, from that project                    |
| `bun pm cache rm`   | errors, no package.json    | answers                                       |

deno takes flags for it — `--no-config --no-lock`, on `info` and on the global installs, whose config the install was
going to ignore anyway with a warning. bun takes none: `info` and `pm cache` are built on its installer, no flag turns
the requirement off, and neither accepts `--global`. So wut does the sequence itself, and the place it stands is bun's
own global project — the one `--global` installs into, under `$BUN_INSTALL`, else `$XDG_CACHE_HOME/.bun`, else `~/.bun`,
plus `install/global`. bun creates that on the first global add and errors until then, `bun pm bin -g` included, so it
cannot even be asked where it is on a machine that has yet to install anything; wut seeds the empty manifest bun would
have written, which bun then keeps, adding only its own `dependencies`. `packBunRun` and `packDoIn` run there and put
the cwd back.

Every other command each of these tools is given was checked from inside a rust, node, deno and python project and
answers the same either way.

## A manager is only offered an op it can do

bun, deno and uv have no outdated command; winget has no cache to clean. A row for one of them was a row that ran
nothing when picked — the table asking a question whose answer it already knew. Each manager's file states the ops it
can do as the arms of its own `match $env.PACK_OP`, so `managerFileOps` reads them from the file rather than from a list
kept beside it, and `initOp` narrows `PACK_MANAGERS` to the managers that answer for this op. `find` is not an arm — it
is the client walking managers, not one of them acting — so it keeps every manager.

## An answer is asked for once

The checks are cheap, not free, and a plan resolving five names against uv ran `uv tool list` five times and printed it
five times for an answer that could not have changed between them. `packInstalled`, `packListedNames` and `packHttpOk`
each remember what they learned for the rest of the run, keyed by the question — the manager and name, the listing
command, the url — so the plan's answers are still there when the sync guard asks again, and bun, pnpm and deno share
one npm round trip instead of making three. The pacman family shares one entry, since all three ask `pacman --query`.
What a `def --env` learns inside a closure is discarded with the closure, so the walks that have something to remember
are `for` loops rather than `where`/`any` — see [NUSHELL.md](NUSHELL.md).

`list` is the one that splits on its argument. Bare, it joins them: the dump is the answer, so there is nothing to
resolve first. Given a term, it has the same local answer `remove` does — which managers hold something matching — and
`packListPlanRun` runs each manager's listing before the table, so the rows name them. Every manager that matches gets a
row, as with `remove`, but `list` reads, so the term only has to start a word of a line of the manager's own output
rather than be a whole name ([COMMANDS.md](COMMANDS.md)). The listing the check reads is `packListCmd`, the same one the
dump prints, so the answer before the gate and the output after it cannot drift.

What the summary shows under each manager is the lines of its listing that matched, and the table is a row per such
manager. It is never the term: a term that starts a word is not a name, so `wut p l go` finds `gotm` under ghpm, `gopls`
under go and `Goose Game` under winget, and showing `go` under all three said each had a package called go.

## The pacman family is one manager

`paru` and `yay` are AUR helpers wrapping `pacman`, so a machine carrying all three has one manager wearing three names,
not three to choose between. Offering them side by side asked the same question three times and, for the ops with no
per-package decision, ran the same upgrade three times over.

The client resolves the family to a single winner — `paru`, then `yay`, then `pacman` — and that winner is what the plan
shows and what runs. Which of the three a group's yaml declared only narrows what is acceptable: an entry naming
`pacman` is a repo package, so any of the three serves it, while one naming `paru` or `yay` is from the AUR, so bare
`pacman` cannot. `packManagerBest` answers both questions at once — it maps a declared manager to the one that will
actually run here, or `null` when nothing can — which is why `packManagerHere` is now a null check over it.

## Nothing viable is an absence, not a plan

A group whose every path needs a manager this machine lacks is not something to show you and refuse to do. The client
drops it, and the cli name it came from falls through to a find like any other unclaimed name:

```
wut p add term      on arch     term-ghostty pacman ghostty
                    on fedora   term         dnf    term        (both groups dropped, the name searched)
                                or, if dnf has no term:  no manager had: term
```

The check that does this is `packExists`, an exact per-manager check — the same one `pack find` uses for whatever no
group claims. Removing runs the same walk with `packInstalled`. Every manager that has a name claims it, and the table
or add's second pick decides between them. Every check is printed as the command it is, its output swallowed, since the
answer is an exit code and the output would bury the plan:

```
http get https://registry.npmjs.org/ripgrep-x
cargo info ripgrep-x
ghpm search ripgrep-x
pacman --sync --info ripgrep-x
no manager had: ripgrep-x
```

Two managers answer fuzzily and need reading rather than an exit code: `ghpm search` always exits 0, so the name column
decides, and npm and jsr are checked by name (`registry.npmjs.org/<name>`) rather than through their search endpoints.

## A group's pre and post scripts run around its stage

A group's `pre` and `post` scripts ([RULES.md](RULES.md#pack-pre-and-post)) show in the plan under the group they belong
to (`first:` and `then:`), so the one decision covers them too — picking a manager is picking its groups' scripts with
it.

Every `pre` script runs before any install or removal, while what it acts on is still there, and every `post` script
after the installs of its stage ([One run, in stages](#one-run-in-stages)), so one can lean on a tool another group in
the same stage just installed, and a group in a later stage can lean on what the post script put down. Each runs once
however many groups name it, and a group whose install or removal failed has no `post` run for it. A failed `pre` is
reported but does not hold its group back — the operation is still what was asked.

`has_cmd` is asked only when a script is about to run, since an install is what put the command there — and after the
installs the run refreshes its PATH ([OPS.md](OPS.md#the-path-wut-checks-is-the-one-a-new-shell-would-have)), so a
command that landed in `~/.cargo/bin` on a first rustup, or in brew's keg-only `opt` dirs, is found in the same run.

Picking in the plan is the yes. Once the table is answered, `YES` is set for the rest of the run, so a `script` install
path and a group's scripts run without asking the questions they would ask under a bare `script exec` — the pick already
answered them, the same way it answers for every manager.

## One run, in stages

A language is a version manager whose setup puts the language down, and its tools are often best installed through that
manager — node-gyp through pnpm, ruff through uv — which on a fresh machine does not exist until the same run installs
it. The plan is resolved before anything installs, so without more it would find no pnpm, and `wut p a node` would end
with pnpm and node but no node-gyp.

A group **provides** a manager when it goes by that manager's name, its own or an alias: `lang/node` is also `pnpm`,
`lang/python` `uv`, `lang/rust` `cargo`, `sys/manager/ghpm` `ghpm`. The server states it on the unit (`provides`), and
when a group's managers are not here, one another picked group provides counts as here for the plan. The group is
planned under that manager, and the summary says what it waits for:

```
ghpm
  lang/node
    pnpm
    then: pnpm/setup
pnpm
  lang/node/node-gyp
    node-gyp
    after: lang/node

manager group
1) ghpm lang/node
2) pnpm lang/node/node-gyp
```

The table is unchanged — one row per group, one prompt — since this is only a matter of order. The run goes a stage at a
time: the groups that wait for nothing, their `post` scripts, a PATH refresh, then the groups that waited for them, and
so on. A group that serves through a manager another group in the plan provides runs after it whether or not that
manager is already here, since the provider's setup can matter to it either way. Remove walks the stages backwards, so
node-gyp goes while pnpm is still there to take it out; sync walks them forwards, the manager before what it serves.

Providing is a forecast, not a promise: the path that wins `lang/node` might be the system nodejs, which puts down no
pnpm, or the install might fail. So a group that waited is checked again when its stage comes. If its manager is there,
it runs; if not, the next manager its yaml lists that is here now runs instead, and the run says so
(`node-gyp: pnpm is
not here, using ghpm`); with none left it is skipped, and says that. Nothing is added to a run that
was not asked for — `wut p a node-gyp` alone on a machine without pnpm does not install pnpm to serve it.

There is no row per method. How a group is installed is the fixed order, decided once, not a question each run; add's
second pick for loose names is the one place a method is chosen, since no yaml speaks for those.

## Tools that update themselves

A tool installed by its own installer — the group's `script` path — is held by no manager, so no manager's sync would
reach it. Each such group states where that installer puts the tool
([RULES.md](RULES.md#pack-sync-of-a-standalone-install)), and a bare sync hands every one of those paths to the client,
which offers a `script` row for the ones whose file is there. A named sync treats the path as one more place the name
can be held. Either way the check is a file existing at a known path — no command runs to answer it, and it reads the
same on every platform.

The update runs the binary at that path, never whatever the name resolves to on PATH: the name can resolve to another
manager's copy, and `deno upgrade` run against ghpm's deno overwrites a file ghpm owns. The tools do not all guard
against that themselves — `uv self update` refuses a copy its installer did not put down, `deno upgrade` does not.

A tool that is itself a manager — ghpm, uv, deno, bun, pnpm — updates itself right before that manager's sync runs, so
it syncs as its newest self: picking the manager's row is what lets it run. The rest run at the `script` row, which is
offered only when there is one of them. The binary's name is how the two are matched. On windows the path is printed and
run with backslashes, whatever the yaml wrote.

Updating is best effort. A distro build usually has self update compiled out, and a user can turn it off; a copy that
refuses answers exactly that, so it is said as a warning and is not a failure — the rest of the sync runs, and the run
does not exit non-zero for it.

## Toolchain managers

Six manage toolchains as well as packages: rustup (cargo and rustc), uv (pythons), rv (rubies), dotnetup (.NET SDKs),
pnpm (the node, bun and deno runtimes) and gotm (go). A bare sync moves the toolchains before the packages, so the
packages update against current ones, each the way its manager moves them — rustup along its channels, uv along each
link it keeps, pnpm to the latest release, gotm to the newest release each pin allows. A named sync is about the
packages it names and leaves the toolchains alone.

- **rustup** is not a package manager at all: the `cargo` on PATH is usually its proxy, a link to the rustup beside it
  (a hard link on windows) dispatching to the real cargo inside the active toolchain. That makes cargo the one manager
  whose own binary another manager delivers, so rustup has no row of its own: a bare cargo sync looks for a `rustup`
  beside wherever `cargo` resolves and runs `rustup update` first, best effort like a self update. That holds however
  rustup arrived — its own installer, winget, pacman, apt or brew — since each puts the proxies beside it. A distro
  cargo has no rustup beside it and is left to its package manager. A toolchain's name is its pin — `stable`, `1.99`
  following the newest 1.99 patch, `1.99.0` staying on it — and `rustup update` moves each in place, leaving nothing
  behind, so a cargo tidy lets no toolchain go: one a project's `rust-toolchain.toml` asked for is as much a pin as one
  installed by hand, and `rustup toolchain uninstall` drops it.
- **uv** is its own top layer — it installs pythons and tools and updates itself — and pins its pythons the way ghpm
  pins a name, by the links in its bin dir: `python` follows the newest stable python, `python3` the newest 3,
  `python3.14` the newest 3.14 patch, and a link naming a patch stays on it. A bare sync moves each link as far as its
  pin allows. `uv python upgrade` moves each installed minor to its newest patch, and the `pythonX.Y` links with it. A
  `pythonX` link moves only through `uv python install --default X.Y`, which sets the bare `python` link as well, so a
  major below the newest moves first and the bare link is set back onto the newest last. `--default` makes the two
  together, so a `pythonX` with no bare link is one taken apart by hand, and is left. The tools then move to the minor
  the bare link names, with `uv tool upgrade --all --managed-python --python <minor>`: a tool's venv is made on one
  python and stays on it through a plain upgrade. uv does not hold a tool back by its own `requires-python` when it is
  given a python, so a tool that has not caught up with a new minor moves anyway. With no bare link the tools upgrade
  where they are, and a machine with no python of uv's is not given one by a sync.

  uv keeps every python it installs, and sync lets none go: a tidy uninstalls the ones nothing links to, as ghpm lets go
  of a release no pin is on. A python's links are the ones in uv's bin dir and the minor's own beside it in uv's python
  dir (`cpython-3.14-...`), which a venv uv made runs through, so the patch `uv python upgrade` moved past is left with
  none. What a project's venv or a tool rests on is not otherwise known, so a python that still has a link stays,
  however old, until `uv python uninstall` drops it. A tool is added with `--managed-python`, so it never lands on a
  distro's python.
- **pnpm** records a runtime as the exact version it installed, so `update` cannot move one: a runtime is set again at
  `latest` — `pnpm runtime set node latest --global` — before the packages update to theirs. pnpm runs no package
  itself: a package's command runs on the node beside it in pnpm's bin dir, and falls back to whatever node PATH finds
  only when pnpm holds none. So an add to a pnpm that holds no node sets one first.
- **rv** is ruby's uv: it installs rubies, and gems as tools, each in an environment of its own, run through `rvx` on
  rv's own ruby. rv pins the machine's ruby the way a project's is pinned, by the `.ruby-version` (or `.tool-versions`)
  in the home dir, and with none it runs the newest ruby it has; its shell integration puts that ruby on PATH. A bare
  sync runs `rv ruby install` from the home dir, so no project's pin answers instead: rv reads the pin itself and
  installs the newest ruby it allows, or the newest of all, and does nothing when that one is in. A machine with no ruby
  of rv's is not given one, and the rubies a sync moves past stay, since a project may still be pinned to one:
  `rv ruby uninstall` lets them go. rv keeps every version a tool was installed at, has no upgrade, and its uninstall
  takes a gem whole, so an update installs the latest beside what is there and, where that leaves more than one version,
  puts the tool back at the latest alone, from rv's cache.
- **dotnetup** keeps .NET SDKs and runtimes side by side under its own root, and pins them the way ghpm does: its
  manifest records each install spec — `lts`, `latest`, `10`, `10.0.4xx`, `10.0.402` — apart from what is installed, and
  `dotnetup update` moves each spec to the newest release it allows and then removes whatever no spec needs, so it
  leaves nothing for a tidy. Where the dotnet row is dotnetup's copy, a bare sync runs `dotnetup update` before
  `dotnet tool update --global --all`. A distro's dotnet is that distro's to move. dotnet has no listing of outdated
  tools, so it is not offered for `outdated`.
- **gotm** is to go what rustup is to cargo — its own tool, managing toolchains rather than packages, with no row of its
  own: the go row that is gotm's copy — the one in `~/.gotm/bin` — runs `gotm sync` first on a bare sync, best effort
  like a self update, so each go it was asked to keep moves to the newest release its pin allows before the tools
  rebuild. A distro's go beside gotm's is the system's install, and is left to the distro; one alone is the go row, with
  no gotm behind it, and the distro moves it. gotm keeps every archive it downloaded until its own tidy, as ghpm does,
  so a go tidy runs `gotm tidy` before it cleans the module cache.

### The copies used

PATH holds whatever put a manager there — a distro's go beside gotm's, a winget .NET beside dotnetup's and scoop's, a
desktop tool's standalone bun in `~/.local/bin`, a pnpm 10 beside a pnpm 12 — and nothing can be expected of what is
found. It finds every copy by walking PATH (`which --all`: each dir the manager is in), and the best kind of install
there is claims the work, the way add's first manager claims a package — with no prompt of its own, since nothing is
installed by it:

1. one in the home, where a toolchain's own manager or an installer puts it: dotnetup's, gotm's, rustup's
   `~/.cargo/bin`, ghpm's, `~/.bun/bin`
2. one a native manager keeps in its own tree: scoop's, homebrew's prefix, the links winget makes for a user's install
3. the system's: `/usr/bin`, Program Files

Every copy of that kind is a row, and the rest are left alone, unchecked and unsaid: a system dotnet is not used for
global tools where dotnetup's or scoop's is here, and is used when it is the only one. The rows run one at a time, in
PATH order, each doing only what its own toolchain calls for — three gos that share `~/go/bin`, at 1.12, 1.79 and 1.15,
rebuild a tool for 1.12, again for 1.79, and leave it for 1.15 — so copies that share a package home are safe to run one
after another: each manager keeps its record of what it installed in that home (cargo's `.crates.toml`, uv's receipts,
bun's global `package.json`), or keeps none and reads the dir (go's binaries, npm's `node_modules`), so a later copy
finds what an earlier one updated. pnpm keeps one global dir per layout (`global/5` for pnpm 10, `global/v11` for 11 and
12), so two majors are two sets of packages, and a remove asks each copy what it holds. A sync and an add reach every
copy, since each moves or builds with its own toolchain; the ops that only read, and a remove, ask one copy per package
home, so two cargos sharing `~/.cargo` list each package once and remove it once.

The plain name is the first copy used, which is what a group's plan and a bare command mean; another is
`go@/opt/go/bin`, and with more than one copy each row's toolchain column says which it is. Every copy runs with its own
dir first on PATH, the plain one too, so everything it reaches for by name — rustc, gofmt, a cargo subcommand, a node —
is its own install's, whatever PATH finds first. A copy the OS will not start (rustup's symlinked proxies over ssh on
Windows) is warned about and holds nothing, rather than ending the run.

A manager and the toolchain it builds and runs on come from one install, never two that PATH order happens to pair. Each
copy used is checked once a run, before anything is offered, and the checks are shown as every check is. One that is
split is said once — the reason on one line, the paths or the fix under it — and is not offered for an add or a sync:

```
uv skipped: a tool runs on a python uv does not manage
  hf /usr/bin
  uv tool install --reinstall --managed-python hf
```

The ops that only read, and a remove, still reach it: they are how a split is undone. The fix is the user's, since wut
does not reorder PATH or reinstall to heal it.

| manager | one install means                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------- |
| bun     | no package starts `#!/usr/bin/env node`, and a copy whose packages start `env bun` is the bun PATH finds first |
| cargo   | `rustc` (and `rustup`, where there is one) resolve into the directory `cargo` does, and `rustc` runs           |
| deno    | a copy with installs is the deno PATH finds first: each install is a script that runs `exec deno`              |
| dotnet  | DOTNET_ROOT names its root (or, unset, it is the system's), and `~/.dotnet/tools` is on PATH                   |
| go      | `gofmt` is beside `go`                                                                                         |
| npm     | `node` is beside `npm` and is the node PATH finds first, and its global prefix is in your home, bin on PATH    |
| pnpm    | a pnpm with packages holds a node for them, and its bin dir is on PATH                                         |
| rv      | `rvx` is beside `rv`: a tool runs only through it, on rv's own ruby                                            |
| uv      | every tool's venv was made on a python uv manages                                                              |

A copy used that PATH does not find first is not split for that alone. go, cargo, uv and pnpm bind what they install by
absolute path — a native binary, a venv's own python, the node beside pnpm's commands — so their packages run on the
right install wherever the copy sits. npm, bun and deno bind through PATH, so for them it is the deciding question.

What the check reads is also what the manager table shows beside each row: the toolchain its sync moves —
`rust 1.99.1 (rustup)`, `go 1.27.3 (gotm)`, `node 26.12.0`, `python 3.13, 3.14`. A few local version calls, no network.
deno and bun are their own runtimes, updated by whatever installed them, so their rows name nothing. npm names the node
it came with, which it does not move: that is the distro's or the tarball's.

The npm pnpm holds is not a manager at all — not split, just not here: its global prefix is inside pnpm's own node
runtime package, so an install there would land in pnpm's tree and be gone when pnpm next moved node. pnpm 12 marks
every command it puts down with a `.pnpm-shim-v1-<name>-target` file beside it, and that is the whole check.

go's tools are what a toolchain move leaves behind. `go install` is go's only update and always builds — free while go's
caches hold the last build, a full compile once they are cleared — so a go sync installs only the tools that need it, as
`cargo install-update` does: one whose module has a newer release, or one built by a toolchain older than the current
one (`go version -m` against `go env GOVERSION`), since a go binary carries the standard library it was built with.
Older rather than different: a module that asks for a newer go than the one installed is built by a toolchain go
downloads for it (`GOTOOLCHAIN=auto`), and that tool is ahead, not behind. `outdated` lists both kinds.

## Failing

Execution fails loud:

- each unit runs inside its own `try`; a failure is recorded and the rest continue
- installs go through `packOpStrict`, which does not swallow the error the way `packOp` does
- the report prints only exceptions — what failed, what nothing could serve
- a ctrl-c stops the run rather than failing the unit: a manager that catches it itself (winget cancels the source it is
  on and carries on) finishes its own step, and no manager after it starts
- a failure exits non-zero; a name nothing carries does not, since that is an answer rather than a fault of the run, and
  exiting on it makes the client shell render its own error over a warning wut already stated plainly

Silence is the bug, not continuing. A failure that scrolled past is the thing this replaces.

## The same shape elsewhere

`virt`, `script` and `file` follow this shape too; it is written up on its own in [OPS.md](OPS.md), with each command's
specifics in [VIRT.md](VIRT.md), [SCRIPT.md](SCRIPT.md) and [FILE.md](FILE.md).
