# Script: ownership, hops, and client-side gates

How `script` decides which shell runs what, and why one of its gates cannot be answered on the server. The shape it
shares with every other command is in [OPS.md](OPS.md); the `script.yaml` gate types and the rule that every gate is
declared twice are in [RULES.md](RULES.md#scriptyaml-gate-enforcement).

## One shell owns each script

The server primarily generates nushell, and `pack`, `file` and `virt` redirect `pwsh`/`zsh` callers to the nu
equivalent. `script exec` is the exception: each script runs in the shell it is written for.

One script hops wholesale. An action alone fans out — the calling shell runs its own scripts inline and hops once per
other shell with `wutShellOnly` appended, which stops that hop from fanning out again.

Every script is owned by exactly one shell, so an overlay never runs twice. The calling shell wins ties — a hop it never
has to make is the cheapest one — and the rest fall back most native first (zsh > pwsh > nu). Both sides of a hop have
to agree on ownership or a script runs twice or not at all, which is why the hop also carries `wutShellFrom`: the leaf
resolves against the shell the run started in, not the shell rendering its own response.

## Tool-first config, action-first cli

The cli reads action first (`wut s e setup ptyxis`); the config tree is tool first (`ptyxis/setup.zsh`). `script`
reverses its filters before globbing. Cardinality splits on the same argument: `wut s e setup` runs every setup script
gated for this machine, while naming a tool pinpoints to one — see [COMMANDS.md](COMMANDS.md).

A script file that no `script.yaml` entry names is unreachable and must not surface. `cfg/script/orphan/setup.nu` is the
fixture that holds that.

## has_cmd is the client's

`sys_*` gates are resolved on the server, from context the client sent. `has_cmd` cannot be — the server does not know
what is on the client's PATH — so it compiles into the emitted script instead, via `scriptHasCmd` from
`src/sh/<shell>/script.<ext>`:

- `script find` hands the whole listing to the client (`scriptFindGroup`), which drops tools whose command is missing,
  and drops the action heading entirely when nothing under it survives
- `script exec` with an action alone wraps each block in the gate, so a fanned out run silently skips what the client
  cannot use — the same shape as a `pack` manager function returning early
- `script exec` with a tool named does **not** wrap it: the run was asked for by name, so the script's own check gets to
  say `'<tool> is not installed'`

Declare `has_cmd` only where the tool must already exist — `install` actions must stay ungated, or they would skip
exactly when they are needed. A script that gates on something other than a command (an app bundle, a config file) keeps
that check in its body only.

## Planning across processes

`script` is the awkward one for [OPS.md](OPS.md)'s one-decision rule, because its fan out spans processes: the calling
shell runs what it owns and hops to nu or pwsh for the rest. The table has to cover those too, and it can — `has_cmd` is
answerable from any shell on the same machine — so the shell you invoked builds a row for every match and asks once, and
each hop carries `wutAgreed=1` and neither plans nor asks.

`script find` does not ask at all: it only prints.

The scripts themselves still ask their own questions once running. Those are per action consent written into the script,
not a manager choice, and they come after the plan was agreed.

## Quoting

`opPrint*RunCmd` evals its arguments, so a value passed to one has its quoting stripped unless it is passed as
`${(qq)var}`. See [NUSHELL.md](NUSHELL.md) for the nu side of the same problem.
