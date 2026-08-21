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

The whole plan renders as a table and asks once. There are no per-manager prompts — a prompt was never a veto, it was
"here is what wut decided, do you agree", and asking it seven times only obscured that. Declining does nothing at all;
agreeing runs the plan non-interactively, so `-y` is exact.

To force a manager, say so up front: `wut p -m pacman add nu` plans only that manager.

## Failing

Planning fails hard, execution fails loud:

- planning — an unsatisfiable group stops the run before anything is touched
- execution — a unit that fails is recorded and the rest continue; a failed pre-command skips its own group's install
  and nothing else
- the end report lists what failed, what nothing could serve, and exits non-zero

Silence is the bug, not continuing. A failure that scrolled past is the thing this replaces.
