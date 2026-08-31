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

`find`, `diff` and `sync` all filter by `fileBinHere`. `find` prints what it matched and stops — it has nothing left to
do once you answer. `list` takes an explicit filter and prints one line per pair out of what the server already sent, so
there is no set to summarise. `sync` is the one that writes:

- `filePlanShow` shows a numbered row per tool with how many files and how many destination directories it accounts for,
  and the tools picked are the only ones written
- a `maps` entry whose `in` is a directory expands to every file inside it, and the destination is cleared first —
  `rm --force --permanent --recursive` — so a removed source file does not survive in place
- `permission` blocks are applied after the copy, as chmod on unix and ACL commands on windows (`getPlatAclPermCmds`)

Because clearing is recursive and permanent, the plan counts directories separately from files: they are the part of a
sync that destroys something.

`diff` fetches each source to a temp file and runs `diff` (or `fc`), reporting a destination that does not exist rather
than treating it as an empty diff.

That fetch is why `diff` asks too, through the same `filePlanShow`: one GET per pair is the same cost `sync` pays, and
what separates the two is that `sync` also writes the result. `diff` reads like `list` — no writes, a filter, a printout
— but the work it does before printing is a network round trip per pair, and cost is what decides which side of the
prompt work belongs on ([OPS.md](OPS.md#cost-decides-which-side-of-the-gate-work-sits-on)). Both ops key their plan off
their own op name, so picking tools for a diff does not carry into a later sync.
