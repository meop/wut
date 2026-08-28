# Script: ownership and client-side gates

How `script` decides which shell runs what, and why one of its gates cannot be answered on the server. The shape it
shares with every other command is in [OPS.md](OPS.md); the `script.yaml` gate types and the rule that every gate is
declared twice are in [RULES.md](RULES.md#scriptyaml-gate-enforcement).

## One shell owns each script, and nu spawns it

`script` redirects `pwsh`/`zsh` callers to nu exactly like `pack`, `file` and `virt`. nu then owns the plan, the gate
and the listing, and spawns each script in the shell it is written for — the same `execScriptShell` a `pack` group's
`script` tier already used to run a zsh entry from nu.

Every script is owned by exactly one shell, so an overlay never runs twice: ownership is `SHELL_PRIORITY` order, most
native first (zsh > pwsh > nu), narrowed by the platform gates the server already applied. It no longer depends on which
shell you typed into, so the same machine runs the same script whatever you invoke from.

What a script needs written into it — its shell's op preamble, and `WUT_ARGS` when `--` was used — is written in that
shell's own syntax, since it is read by that shell and not by the nu that spawned it. `getScriptFlavorShell` resolves
the flavor, and both the preamble and the interpreter follow it rather than the platform: `script.yaml` is free to gate
a pwsh script onto linux.

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

## Planning

`script` plans like every other command now: the server emits `SCRIPT_PLAN` as data and the bodies behind ids in a
generated `scriptRunUnit`, and `scriptPlanRun` drops what `has_cmd` rules out, tables what is left, and spawns only what
was picked. There is nothing to carry across processes, because the decision is made once before any script is spawned.

`script find` prints what it matched and stops, per [OPS.md](OPS.md) — it has nothing left to do once you answer.

The scripts themselves still ask their own questions once running. Those are per action consent written into the script,
not a manager choice, and they come after the plan was agreed.

## Quoting

`opPrint*RunCmd` evals its arguments, so a value passed to one has its quoting stripped unless it is passed as
`${(qq)var}`. See [NUSHELL.md](NUSHELL.md) for the nu side of the same problem.
