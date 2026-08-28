# Ops: one shape, one decision

Every command — `pack`, `virt`, `file`, `script` — runs the same way. This is that shape; the per-command pages
([PACK.md](PACK.md), [VIRT.md](VIRT.md), [FILE.md](FILE.md), [SCRIPT.md](SCRIPT.md)) only cover what is theirs alone.

## Who answers what

The server and the client each know half the question, and neither can answer for the other.

- **server** — what the config says. Which groups exist, which instances a host declares, which scripts a platform is
  gated for. It resolves all of that and emits it as **data**.
- **client** — what this machine actually has. Whether `pacman` is on this PATH, whether `podman` is installed, whether
  the tool a script needs exists.

So the server never pre-renders a listing. Pre-rendered text has nowhere left to apply the client's half, and the op
then offers things the machine cannot do. That is exactly how `virt find` drifted: it shipped `opPrint` lines and so
listed lxc, podman and qemu on machines that had none of them.

Each command has one client-side predicate for its half:

| Command  | Predicate         | Answers                                         |
| -------- | ----------------- | ----------------------------------------------- |
| `pack`   | `packManagerHere` | is this manager on PATH                         |
| `virt`   | `virtManagerHere` | is this manager on PATH                         |
| `file`   | `fileBinHere`     | is this tool installed                          |
| `script` | `scriptHasCmd`    | is the command a `has_cmd` gate names installed |

## Filter, summarise, ask once

The client then does the same three things, in this order:

1. **filter** the server's data by that predicate
2. **summarise** what is left, as a table
3. **ask once**, and run what was picked without asking again

Order matters. The filter comes first so a machine with nothing installed is _told_ — `manager not installed: ...` —
rather than asked a question whose answer changes nothing. And the ask is once, for the plan as a whole.

`pack` and `virt` ask it as a numbered selection over the summary rather than a yes/no: empty takes everything, `0`
quits, and `1 3` / `1,3` / `1-3` take a subset, in ghpm's syntax. The rows were already built and shown, so answering
them is cheaper than cancelling to re-run behind a filter flag — which is why neither command has one. `-y` takes
everything.

The plan travels as data and the bodies behind it as generated code — `PACK_PLAN` with `packRunUnit`, `VIRT_PLAN` with
`virtPlanRun` — so code stays code and the plan stays data.

## An op asks when work follows the answer

Every op shows what it knows first. Whether it then asks is not about whether it writes — it is about whether anything
is left to do once you answer:

| Op                                          | Shows                    | Then asks about              |
| ------------------------------------------- | ------------------------ | ---------------------------- |
| `pack add`/`remove`                         | manager, group, packages | installing them, and `?`     |
| `pack list`/`outdated`/`info`/`sync`/`tidy` | nothing yet              | which managers to run        |
| `virt add`/`rem`/`list`/`run`/`sync`/`tidy` | manager, instances       | which managers to run        |
| `file sync`                                 | tool, files, directories | which tools to write         |
| `script exec`                               | action, tool, shell      | running them                 |
| `pack find`                                 | the groups it matched    | searching for what it cannot |
| `virt find`, `file find`, `script find`     | everything               | — nothing left, so no prompt |

A `find` already knows what it is going to say, so answering would gate nothing: it prints and stops. `pack find` is the
one that can have work left — a typed name no group claimed is only resolvable by asking managers — so the server emits
`packFindSearch` beside `packFindShow` only when there is something to search for, and that search is what the prompt
guards.

The ops with nothing to show first are the ones whose output _is_ the manager running: `list`, `outdated`, `info`,
`sync` and `tidy` cannot describe a plan they have not run yet. They go straight to the table.

`src/cmd/prompt_test.ts` holds this: that every op with work left reaches a prompt, that a `find` reaches none, that
`pack find` with an unresolved name does, and that a gate is never emitted inline.

Once means once for the whole run. `PACK_AGREED` and `VIRT_AGREED` carry the answer past the first question, so every
manager function downstream acts without asking again.

The expensive half always sits behind the gate: `pack add`'s loose-name lookups and `pack find`'s search both run
against the managers you picked, not every one installed. A gate the work happens in front of is decoration.

`file diff` and `file list` are the exceptions that prove it: they take an explicit filter and print one line per pair,
so there is no set to summarise and nothing to decide.

Scripts are the one place a second question is legitimate: a script's own body may ask before it acts. That is per
action consent written into the script, not a manager choice, and it happens after the plan was agreed.

## Nothing matched, nothing installed

Two different absences, two different messages:

- a filter that matched nothing → `no instance matched: ...` / `no file matched: ...` / `no script matched: ...`, per
  [COMMANDS.md](COMMANDS.md#nothing-matched). `find` is exempt: an empty search result is an answer.
- everything matched but nothing is installed → `manager not installed: ...`, from the client's filter.

Neither is an error. Both are said out loud rather than emitting a body that quietly does nothing.
