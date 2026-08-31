# Pack: groups, plans, and one decision

How `pack add` and `pack remove` decide what to do, and when they ask.

## What a group yaml is for

A group exists to state something the client cannot work out for itself:

- **a naming difference between platforms** — `nu` on ghpm and cargo, `nushell` on pacman
- **companions that ship separately** — `nodejs` plus `npm` on pacman, one package on brew
- **something to run instead of a package install** — the `script` tier
- **membership** — a group whose contents are other groups

A file whose every manager installs one name identical to the file name states none of those, and should not exist. The
name falls through to the managers on its own.

## Finding

`pack find` resolves a typed name exactly like `add` does — the same path match, alias, or declared package name (see
Resolving, below) — so a name either command would recognize, the other does too. A name no group claims is not dropped;
it becomes a **remaining** name, checked against real managers after the gate, the same way add checks a loose one.

Matching and applicability are separate questions: the first is about the name you typed, the second about the machine
you are on. Applicability is answered in two places, because neither side knows both halves:

- **server** — does this platform have a manager the group names, or is its script gated in. `p f llm` lists the llm
  groups on arch and nothing on fedora, since none of them declares a dnf entry.
- **client** — is one of those candidates really on this PATH. `packFindWinner` picks the first one that is, in the
  group's own declared order — the same rule `packPickPath` uses for add.

`packFindShow` prints what matched — manager, then group, then the package name (or the script's rel file path) — and
that is the whole of it when every typed name was claimed. A name no group claimed is the only thing find cannot answer
on its own, so the server emits `packFindSearch` too: it lists the unclaimed names under `?`, tables the managers it
would ask, and searches only the ones picked. Nothing to search for means no table and no question.

## Resolving

1. Each cli name resolves to groups via `resolveGroupName`: the group's own path (prefix, suffix, or last segment), or a
   `startsWith` hit on an alias or a declared package name (`windirstat` reaches a group named `desktop-tool-extra`
   because some manager under it declares that exact package). `find` matches the same way, via `matchesGroupQuery`. A
   name matching no group is a **loose name**.
2. A group's `group` tier lists other groups (or loose names). The walk is iterative over a stack with a visited set of
   resolved group names, so a cycle stops and a diamond resolves once.
3. Preference is fixed at **user managers > script > system managers**. The yaml carries one flat `manager` map and says
   nothing about tiers; wut derives the tier from the manager and owns the order.

## Planning, client side

The server cannot know which managers exist on the machine, so it emits resolved data and the client builds the plan.

- **Group rows** need no search when adding. The winner is the first manager that exists here, in tier order, with names
  for this group. The yaml already stated what works; there is nothing to verify.
- **Loose rows** need a search, because nothing has stated anything. Each manager is asked in preference order, and the
  first that claims the name wins it.
- A group with no manager on this machine is **config rot**: it blocks the run. Nothing installs, the row says so, and
  one yaml edit fixes it.
- A loose name nothing can serve is a **typo**: it shows as unservable and the rest of the plan proceeds.

## Add and remove ask different questions

Both walk the managers in the same preference order, but they are not asking the same thing, and reading a name's fate
off the wrong question is how a plan ends up naming a manager that has nothing to do:

|          | The question             | Answered by     | Costs                    |
| -------- | ------------------------ | --------------- | ------------------------ |
| `add`    | who **could** serve this | `packExists`    | a registry round trip    |
| `remove` | who **already has** this | `packInstalled` | a local listing or query |

A name can be available everywhere and installed in exactly one place. `git-filter-repo` is on pypi, on npm and on
github, so every user manager could serve it — but uv is the one holding it, and only uv can let it go. Asking
availability on the way to an uninstall picks whichever manager sorts first and runs a command against a manager that
never had the package.

That difference decides where the work sits relative to the gate, too. `packExists` reaches the network, so add's loose
names stay behind `?` until something is picked — see [OPS.md](OPS.md#an-op-asks-when-work-follows-the-answer).
`packInstalled` reads what is already on the machine, so remove runs it **before** the table and states the winner by
name. Remove has no `?` row: by the time it asks, there is nothing left to find out.

The same split applies one level up, to group rows. A group states which managers _can_ serve it, never which one did,
so removing walks its stated order and takes the first whose declared names are actually installed. A group nothing
holds is already gone — it is dropped rather than uninstalled from a manager that is merely present.

Each manager answers the installed question the exact way it can: a query that succeeds or fails by exit code where one
exists (`pacman --query`, `brew list --versions`, `dpkg-query`, `rpm --query`), and its own listing parsed to entry
names where none does (`uv tool list`, `cargo install --list`, `ghpm list --long-names`). Parsing matters more than it
looks: these listings hang detail off their entries — uv restates each tool as `- name` beneath it, cargo indents the
binaries a crate installs — and reading that detail as an entry is how a check starts agreeing with everything.
`src/sh/nu/pack_test.ts` pins those formats against stub managers.

## One decision

The plan collapses to one numbered row per manager, and the numbers are the decision:

```
manager   packages
-------   --------
1) pacman ghostty, zsh
2) ghpm   nu
3) script rustup

enter number(s) [empty=all] (0=quit | 1[,][-]3):
```

Empty takes every manager, `0` quits, and anything else is a selection in ghpm's syntax — `1 3`, `1,3`, `1-3`, or a mix.
Picking a manager takes everything it won, which is why the packages column names them: the number is the only thing to
read, but what rides along with it is stated.

Selecting rather than confirming is what removed `-m`. A yes/no gate could only accept or reject the whole plan, so
narrowing it meant cancelling, re-typing the command with a flag, and re-reading the same table. The list already had to
be built and shown; letting it be answered is the same table doing one more job.

There are no per-manager prompts either — a prompt was never a veto, it was "here is what wut decided, do you agree",
and asking it seven times only obscured that. Whatever is picked runs non-interactively, so `-y` is exact and takes
everything, and `wutSelectRead` is the single place `-y` is read. The per-manager confirms are deleted rather than
guarded: a check that can never fire reads like a safety net and holds nothing.

The server emits the plan as data (`PACK_PLAN`) and the bodies behind ids in a generated `packRunUnit`, so code stays
code and the plan stays data. The client picks each group's winner and resolves loose names with an exact per-manager
check — `packExists` when adding, `packInstalled` when removing. Refreshes run before add's checks so the answers are
current; remove refreshes nothing, since a remote index has no bearing on what is already here. `find`'s remaining names
resolve the way add's do (`packFindFirst`), just after its own gate rather than add's, and they answer to a `?` row so
they can be taken or left like any manager.

`sync`, `tidy`, `outdated` and `info` have no per-package decision to make — the only question is which managers this
run touches — so they share a plainer plan, `packManagerPlanRun`, whose rows are just the managers present.

`list` is the one that splits on its argument. Bare, it joins them: the dump is the answer, so there is nothing to
resolve first. Given a term, it has the same local answer `remove` does — which managers hold something matching — and
`packListPlanRun` runs each manager's listing before the table, so the rows name them. It stays WIDE where `remove` is
PINPOINT: every manager that matches gets a row, and the match is a substring of the manager's own output rather than an
exact name ([COMMANDS.md](COMMANDS.md)). The listing the check reads is `packListCmd`, the same one the dump prints, so
the answer before the gate and the output after it cannot drift.

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
group claims. Removing runs the same walk with `packInstalled`. Only the first manager in preference order may claim a
name. Every check is printed as the command it is, its output swallowed, since the answer is an exit code and the output
would bury the plan:

```
http get https://registry.npmjs.org/ripgrep-x
cargo info ripgrep-x
ghpm search ripgrep-x
pacman --sync --info ripgrep-x
no manager had: ripgrep-x
```

Two managers answer fuzzily and need reading rather than an exit code: `ghpm search` always exits 0, so the name column
decides, and npm and jsr are checked by name (`registry.npmjs.org/<name>`) rather than through their search endpoints.

## Failing

Execution fails loud:

- each unit runs inside its own `try`; a failure is recorded and the rest continue
- installs go through `packOpStrict`, which does not swallow the error the way `packOp` does
- the report prints only exceptions — what failed, what nothing could serve
- a failure exits non-zero; a name nothing carries does not, since that is an answer rather than a fault of the run, and
  exiting on it makes the client shell render its own error over a warning wut already stated plainly

Silence is the bug, not continuing. A failure that scrolled past is the thing this replaces.

## The same shape elsewhere

`virt`, `script` and `file` follow this shape too; it is written up on its own in [OPS.md](OPS.md), with each command's
specifics in [VIRT.md](VIRT.md), [SCRIPT.md](SCRIPT.md) and [FILE.md](FILE.md).
