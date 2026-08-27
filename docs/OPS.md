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
3. **ask once**, and run the whole thing without asking again

Order matters. The filter comes first so a machine with nothing installed is _told_ — `manager not installed: ...` —
rather than asked a question whose answer changes nothing. And the ask is once, for the plan as a whole: a prompt was
never a veto, it is "here is what wut decided, do you agree". Declining does nothing at all; agreeing runs the plan
non-interactively, so `-y` is exact.

The plan travels as data and the bodies behind it as generated code — `PACK_PLAN` with `packRunUnit`, `VIRT_PLAN` with
`virtPlanRun` — so code stays code and the plan stays data.

## What earns a prompt

**A prompt guards commands run on the machine, never a listing.** Printing what the server already worked out is not
something to agree to.

| Op                                                                                 | Asks | Because                                    |
| ---------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| `pack add`/`remove`                                                                | once | installs                                   |
| `pack find` (with a name), `list`, `outdated`, `sync`, `info`                      | once | runs a manager search or a manager command |
| `virt add`/`rem`/`list`/`run`/`sync`/`tidy`                                        | once | runs a manager command                     |
| `script exec`                                                                      | once | runs scripts                               |
| `file sync`                                                                        | once | writes files, clears directories           |
| `pack find`'s group listing, `virt find`, `script find`, `file find`/`list`/`diff` | no   | prints what the server sent                |

The four finds used to disagree. `pack find` asked twice, once around the listing and again before the searches;
`virt find` and `script find` asked before printing; `file find` did not ask at all. `gatedFunc` has no caller in wut
for that reason — every remaining prompt sits inside a `*PlanRun`, behind a summary.

Scripts are the one place a second question is legitimate: a script's own body may ask before it acts. That is per
action consent written into the script, not a manager choice, and it happens after the plan was agreed.

## Nothing matched, nothing installed

Two different absences, two different messages:

- a filter that matched nothing → `no instance matched: ...` / `no file matched: ...` / `no script matched: ...`, per
  [COMMANDS.md](COMMANDS.md#nothing-matched). `find` is exempt: an empty search result is an answer.
- everything matched but nothing is installed → `manager not installed: ...`, from the client's filter.

Neither is an error. Both are said out loud rather than emitting a body that quietly does nothing.
