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

## The client's gates

`sys_*` gates are resolved on the server, from context the client sent. The rest cannot be — the server does not know
what the client has — so `script find` and `script exec` with an action alone hand the client the plan as data
(`SCRIPT_PLAN`), and `scriptPlanHere` in `src/sh/nu/script.nu` answers them:

- **has_cmd** — one of its commands is on PATH (`scriptHasCmd`, a `which`). A setup for a tool that is not there has
  nothing to set up
- **no_cmd** — none of its commands is on PATH. An install whose tool is already in has nothing to install
- **has_svc** / **no_svc** — the same for services (`scriptHasSvc`), which is how a windows feature shows it is
  installed: `sc.exe query` on windows, a systemd unit file on linux. A windows feature's install gates on `no_svc`, and
  a setup of it on `has_svc`

Both are cheap, so they run before anything is shown, as
[OPS.md](OPS.md#cost-decides-which-side-of-the-gate-work-sits-on) has every op's cheap reads do. Whether a script has
more to do beyond that — whether a setup's state already matches — is not asked up front: answering it means running
each script's own checks, which is the script's work, so it happens once the script runs, and the script says
`already set` or `already installed` itself. That keeps every setup and teardown listed wherever its tool is, ready to
run again after a change to wut-config.

`script find` lists each action with the tools that apply, then the ones the gates rule out as a `not applicable` group
of the same shape, nested one level as `virt find` nests a manager's pods; its table counts only what applies.
`script exec` with an action alone tables only what applies, or says `nothing to do`. `script exec` with a tool named is
not gated: the run was asked for by name, so the script's own `'<tool> is not installed'` or `'already installed'`
explains a no op.

Declare `has_` only where the tool must already exist, and `no_` only on an install — never `has_` there, or it would
skip exactly when it is needed. A script that gates on something neither a command nor a service names (an app bundle, a
config file, a registry value) keeps that check in its body only.

## Writing a script

Every script works out what there is to do — reading only — before its first question, and asks through shire's `opAsk`,
never its own `read`, `Read-Host` or `input`. What it checks before asking is the verb's:

- **install** — the tool is not there yet (its command, or for a windows feature the service it brings)
- **setup** — the state it would write differs from what is there; run again after a change to wut-config, it brings the
  machine in line
- **teardown** — something it would undo is still there
- **repair** — setup without the "already done" shortcut: asked whenever there is something to repair at all (the tool,
  its files, a guest), and done again each time

A script with several steps asks once per step.

## Planning

`script` plans like every other command: the server emits `SCRIPT_PLAN` as data and the bodies behind ids in a generated
`scriptRunUnit`, and `scriptPlanRun` takes what `scriptPlanHere` left, tables it, and spawns only what was picked. There
is nothing to carry across processes, because the decision is made once before any script is spawned.

`script find` prints what it matched and stops, per [OPS.md](OPS.md) — it has nothing left to do once you answer.

The scripts themselves still ask their own questions once running. Those are per action consent written into the script,
not a manager choice, and they come after the plan was agreed.

## Quoting

`opPrint*RunCmd` evals its arguments, so a value passed to one has its quoting stripped unless it is passed as
`${(qq)var}`. See [NUSHELL.md](NUSHELL.md) for the nu side of the same problem.
