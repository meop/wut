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

## Every op asks, exactly once

There is no read-only exemption. `find` asks too, because the point of the question is not "may I change something" — it
is _here is what I found on this machine, shall I go on_. Skipping it for the print-only ops is what let `virt find`
list managers it had never checked for.

| Op                                          | Table                    | Then                 |
| ------------------------------------------- | ------------------------ | -------------------- |
| `pack find`                                 | group, managers here     | the manager searches |
| `pack add`/`remove`                         | group, manager, packages | installs             |
| `pack list`/`outdated`/`sync`/`info`/`tidy` | manager                  | each manager's turn  |
| `virt find`                                 | manager, instance count  | the instance listing |
| `virt add`/`rem`/`list`/`run`/`sync`/`tidy` | manager, instances       | each manager's turn  |
| `file find`                                 | tool, file count         | the tool listing     |
| `file sync`                                 | tool, files, directories | writes and clears    |
| `script find`                               | action, tool count       | the action listing   |
| `script exec`                               | action, tool, shell      | the scripts          |

`src/cmd/prompt_test.ts` holds this: it asserts that every op reaches a prompt, that each find asks through its own plan
runner, and that wut's `use <cmd>` gate is never emitted inline — the shape that asked before it had filtered anything,
and that let `pack find` ask twice.

Once means once for the whole run. `PACK_AGREED`, `VIRT_AGREED` and `wutAgreed=1` carry the answer past the first
question, so `pack find`'s search phase and every manager function downstream act without asking again.

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
