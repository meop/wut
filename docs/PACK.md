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

`pack find` matches on group name and aliases only. What a manager has is that manager's own search to answer, and it
still runs after the listing when a name was given.

Matching and applicability are separate questions: the first is about the name you typed, the second about the machine
you are on. Applicability is answered in two places, because neither side knows both halves:

- **server** — does this platform have a manager the group names, or is its script gated in. `p f llm` lists the llm
  groups on arch and nothing on fedora, since none of them declares a dnf entry.
- **client** — is one of those managers really on this PATH. The server sends each row with its candidate managers and
  `packFindGroup` drops the row if none of them is there, so a yay-only group stays hidden on an arch box without yay.

A row with no candidates is script satisfied and always shows.

## Resolving

1. Each cli name resolves to groups via `resolveGroupName` (path match, then alias). A name matching no group is a
   **loose name**.
2. A group's `group` tier lists other groups (or loose names). The walk is iterative over a stack with a visited set of
   resolved group names, so a cycle stops and a diamond resolves once.
3. Preference is fixed at **user managers > script > system managers**. The yaml carries one flat `manager` map and says
   nothing about tiers; wut derives the tier from the manager and owns the order. `-m a,b` overrides both the candidate
   set and the order for one invocation.

## Planning, client side

The server cannot know which managers exist on the machine, so it emits resolved data and the client builds the plan.

- **Group rows** need no search. The winner is the first manager that exists here, in tier order, with names for this
  group. The yaml already stated what works; there is nothing to verify.
- **Loose rows** need a search, because nothing has stated anything. Each manager is refreshed and asked in preference
  order, and the first that has the name wins it.
- A group with no manager on this machine is **config rot**: it blocks the run. Nothing installs, the row says so, and
  one yaml edit fixes it.
- A loose name nothing can serve is a **typo**: it shows as unservable and the rest of the plan proceeds.

## One decision

The plan renders as a table and asks once:

```
group        manager packages
-----        ------- --------
term-ghostty pacman  ghostty
term-wt      -       needs winget

use pack [y,[n]]:
```

There are no per-manager prompts — a prompt was never a veto, it was "here is what wut decided, do you agree", and
asking it seven times only obscured that. Declining does nothing at all; agreeing runs the plan non-interactively, so
`-y` is exact. To force a manager, say so up front: `wut p -m pacman add nu` plans only that manager, and `-m` can name
`script` too.

The server emits the plan as data (`PACK_PLAN`) and the bodies behind ids in a generated `packRunUnit`, so code stays
code and the plan stays data. The client picks each group's winner — the first path whose manager is on this PATH, in
the group's own order — and resolves loose names with `packExists`, an exact check per manager, not the substring search
`find` uses. Refreshes run before those checks so the answers are current.

`sync`, `tidy`, `list`, `outdated`, `info`, and a named `find` have no per-package decision to make — the only question
is which managers this run touches — so they share a plainer plan, `packManagerPlanRun`: a `manager` column, one
question, then each manager present gets its turn:

```
manager
-------
brew
cargo
pacman

use pack [y,[n]]:
```

## Nothing viable is an absence, not a plan

A group whose every path needs a manager this machine lacks is not something to show you and refuse to do. The client
drops it, and the cli name it came from falls through to a find like any other unclaimed name:

```
wut p add term      on arch     term-ghostty pacman ghostty
                    on fedora   term         dnf    term        (both groups dropped, the name searched)
                                or, if dnf has no term:  no manager had: term
```

The find that does this is `packExists`, an exact check per manager, not the substring search `find` runs — choosing a
manager and researching a partial name are different questions, and only the first may claim a package. Every check is
printed as the command it is, its output swallowed, since the answer is an exit code and the output would bury the plan:

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
- the report prints only exceptions — what failed, what nothing could serve — and exits non-zero

Silence is the bug, not continuing. A failure that scrolled past is the thing this replaces.

## The same shape elsewhere

`virt`, `script` and `file` follow this shape too; it is written up on its own in [OPS.md](OPS.md), with each command's
specifics in [VIRT.md](VIRT.md), [SCRIPT.md](SCRIPT.md) and [FILE.md](FILE.md).
