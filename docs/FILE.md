# File: keys, directories, and the one op that writes

How `file` maps config into place. The `file.yaml` shape — `maps`, `aliases`, `permission`, template substitution — is
in [RULES.md](RULES.md#fileyaml-structure); the shape shared with every other command is in [OPS.md](OPS.md).

## A key is its own bin check

A `file.yaml` key is the tool's name, and `fileBinHere` treats the key and its aliases as the candidate binaries to look
for. `zed` with aliases `zeditor, zed-cli` is present if any of the three is on PATH, so a config for something not
installed is skipped rather than written.

That compound key travels to the client as `zed,zeditor,zed-cli|settings.json` — the names to check on the left, the
`in` paths on the right — and is what `find` prints as a heading. An alias is a lookup key only, never a path of its
own.

## Four ops, one that writes

`find` and `sync` both plan — filter by `fileBinHere`, table, one question. `diff` and `list` take an explicit filter
and print one line per pair, so there is no set to summarise. `sync` is the one that writes:

- `filePlanShow` shows a row per tool with how many files and how many destination directories it accounts for, then
  asks once
- a `maps` entry whose `in` is a directory expands to every file inside it, and the destination is cleared first —
  `rm --force --permanent --recursive` — so a removed source file does not survive in place
- `permission` blocks are applied after the copy, as chmod on unix and ACL commands on windows (`getPlatAclPermCmds`)

Because clearing is recursive and permanent, the plan counts directories separately from files: they are the part of a
sync that destroys something.

`diff` fetches each source to a temp file and runs `diff` (or `fc`), reporting a destination that does not exist rather
than treating it as an empty diff.
