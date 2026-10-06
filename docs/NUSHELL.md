# Nushell Pitfalls

Known nushell parsing and runtime quirks that have caused bugs in `src/sh/nu/`. Read before editing nushell output.

- **`[{record} | to yaml]` is a list, not a pipeline.** In nushell 0.111+, `|` inside `[...]` is a list separator.
  `[{a: 1} | to yaml]` produces the 3-element list `[{a: 1}, "to", "yaml"]`. Use `[({a: 1} | to yaml)]` with extra
  parens to force a pipeline inside a list literal.

- **Nested `$"..."` inside `$"r##'(expr)'##"`** — if `expr` contains its own `$"..."` interpolation, the inner closing
  `"` terminates the outer string. Fix by rewriting inner interpolations as string concatenation: `'exec ' + $cmd`
  instead of `$"exec ($cmd)"`.

- **`r#'...'#` with `#!` content** — nushell misparsed `r#'#` as a comment start. Use `r##'...'##` for any content that
  starts with `#` (e.g. shebangs). Fix was merged in 0.101 then reverted; see
  https://github.com/nushell/nushell/pull/14548.

- **`http get --raw` vs `http get` and `$"(...)"` wrapping** — `http get` without `--raw` auto-parses the response body
  based on content type (JSON → record, etc.), which breaks `nu -c` invocations expecting a string. Always use `--raw`
  when fetching scripts to execute. Two distinct patterns depending on intent:
  - **Execute as code**: `nu --no-config-file -c $"( http get --raw --redirect-mode follow $url )"` — `$"(...)"`
    converts the raw bytes to a string for `-c`. Safe because script responses are always valid UTF-8.
  - **Save to disk**: `http get --raw --redirect-mode follow $url | save --force $path` — pipe binary directly, no
    `$"(...)"` wrapper. Wrapping corrupts non-UTF-8 files (e.g. PNGs).

- **Bare words on the RHS of assignments are external command calls (since 0.97.0).** `$yn = y` and `let cmd = docker`
  are parse errors — nushell treats the bare word as an external command to execute, not a string literal. Always quote
  string values in assignments: `$yn = 'y'`, `let cmd = 'docker'`. Bare words ARE valid (no quotes needed) in: match arm
  patterns (`arm64 =>`), comparison operators (`$x == linux`, `$x != n`), and command argument position
  (`str starts-with record`).

- **Bare words in `in $env`/`not-in $env` checks only work without surrounding parens.** `if KEY in $env {` works, but
  `(KEY in $env)` treats the bare word as an external command (error: command not found). In compound `or` conditions
  where each clause is wrapped in `(...)`, always quote the key: `('KEY' in $env)`, `('KEY' not-in $env)`.

- **Unquoted absolute path at the start of a `()` subexpression pipeline is executed as a command.**
  `(/etc/os-release | path exists)` tries to execute `/etc/os-release` as an external command (error: "not executable").
  Quote the path: `('/etc/os-release' | path exists)`.

- **A `def --env` writes into its caller, but not out of a closure.** `load-env` inside a command called from `each`,
  `where` or `any` is discarded when the iteration ends, so a check that remembers its answer remembers nothing when it
  is called that way. `pack.nu` walks with `mut` and `for` where the body has something to keep — see the caches in
  `packInstalled`, `packListedNames` and `packHttpOk`.

- **A multi-line boolean expression needs its own parens.** As the condition of an `if (...)` the parens are already
  there; as the body of a `def` they are not, and the expression ends at the first newline
  (`nu::parser::incomplete_math_expression`). Wrap the whole body in one `(...)`, as `packSkip` does.

- **`const` is resolved at parse time, so it must precede its first use.** Unlike `def`, which the parser hoists, a
  `const` declared below the command that reads it fails with `variable not found`. `PACK_PACMAN_FAMILY` sits at the top
  of `pack.nu` for that reason.

- **How nu handles a ctrl-c** (from its source, 0.116). The ctrl-c handler sets one interrupt flag per process, from a
  thread of its own (the `ctrlc` crate's `set_handler_inner`), so nu can see a command the ctrl-c stopped exit before
  its own flag is set. A script's children share its process group, so every nu in a chain gets one
  (`crates/nu-system/src/foreground.rs`). The flag is checked only at a jump or a return — a branch, a loop iteration,
  the end of a block — and inside commands that wait or write (`crates/nu-protocol/src/ir/mod.rs`, `check_interrupt`),
  and raised there as `Interrupted`; `exit` is not a check. A `catch` or `finally` clears it only when the error it
  handles is `Interrupted`, or on unix `TerminatedBySignal` (`crates/nu-engine/src/eval_ir.rs`,
  `reset_signals_if_interrupted`). Uncaught, `Interrupted` is always printed — `display_errors` can hide only
  `NonZeroExitCode` and, on unix, `TerminatedBySignal` (`crates/nu-protocol/src/config/display_errors.rs`) — which is
  why `termination_signal = false` never made it quiet. So a ctrl-c can be raised late, anywhere.

- **`try` catches ctrl-c**, a bare `try { }` included. A loop that records a failure and moves on, or a
  `catch { null }`, steps past the user's stop where zsh and pwsh would have stopped. Every `catch` in wut's nu calls
  shire's `opRethrowInterrupt $e` first, and every `try` has a catch; `catch_test.ts` fails on one that does not.
  `opInterrupted` is the one test for a ctrl-c: `Interrupted`, an `input` prompt's io error, or an `exit_code` of 130 (a
  command that read it), -2 (a command that died of SIGINT) or -1073741510 (windows' `STATUS_CONTROL_C_EXIT`). A caught
  error carries `exit_code` for a command's failure: the code, or minus the signal for a signal death.

- **Quiet is one wrapper per nu process, at its top.** shire's `NuSh.build()` wraps every nu script, and `opRunCmd` the
  child nu each command runs in: a ctrl-c that reaches the top ends the run with exit code 130 and no error output; any
  other error is raised again and reported as before. Because the interrupt can land late, even inside the wrapper's own
  catch, the wrapper has an outer catch that does nothing but the same exit. Nothing below the top needs to know about
  any of this, beyond rethrowing — except cleanup that has to run however a command ended, like the one after a
  foreground qemu run: it runs as `try { X } catch { |e| X; $e }` and raises what it caught afterwards. The interrupt
  fires once, so if it cuts the first attempt short, the second completes.

- **A `try { }` inside an `opRunCmd` string hides how the command ended.** The inner `nu -c` swallows the error and
  exits 0. `pack`'s wrapper carries `PACK_TRY_CATCH`, which lets an abnormal end (a negative `exit_code`: a signal on
  unix, an NTSTATUS on windows) and a ctrl-c through. Uncaught, nu exits with a signal death's `exit_code`, so a `nu -c`
  whose command died of SIGINT exits 254 (`-2`), not the `128 + signal` a POSIX shell uses.
