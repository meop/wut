# Nushell Pitfalls

Known nushell parsing quirks that have caused bugs in `src/sh/nu/`. Read before editing nushell output.

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
