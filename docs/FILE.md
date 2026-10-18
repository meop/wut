# File: keys, directories, and the one op that writes

How `file` maps config into place. The `file.yaml` shape — `maps`, `permission`, template substitution — is in
[RULES.md](RULES.md#fileyaml-structure); the shape shared with every other command is in [OPS.md](OPS.md).

## A key is its own bin check

A `file.yaml` key is the tool's name and the binary `fileBinHere` looks for: `zed` is present if `zed` is on PATH, so a
config for something not installed is skipped rather than written. A key has no other names — one that needs to answer
to a second binary is a second key.

The key travels to the client as `zed|settings.json` — the name to check on the left, the `in` paths on the right — and
is what `find` prints as a heading.

## Four ops, one that writes

A term names a tool by its key: `diff` and `sync` take it whole, `find` and `list` the start of a word of it, or of a
source path ([COMMANDS.md](COMMANDS.md)). `find`, `diff` and `sync` all filter by `fileBinHere`. `find` prints what it
matched and stops — it has nothing left to do once you answer. `list` takes an explicit filter and prints one line per
pair out of what the server already sent, so there is no set to summarise. `sync` is the one that writes:

- `filePlanShow` lists each tool here with the directories it clears (`clear:`) and the files it writes, then a numbered
  row per tool, and the tools picked are the only ones written
- a `maps` entry whose `in` is a directory expands to every file inside it, and the destination is cleared first —
  `rm --force --permanent --recursive` — so a removed source file does not survive in place
- `permission` blocks are applied after the copy, as chmod on unix and ACL commands on windows (`getPlatAclPermCmds`)

Because clearing is recursive and permanent, the summary names each directory a tool clears on a line of its own, first:
they are the part of a sync that destroys something.

`diff` fetches each source to a temp file and runs `diff` (or `fc`), reporting a destination that does not exist rather
than treating it as an empty diff.

That fetch is why `diff` asks too, through the same `filePlanShow`: one GET per pair is the same cost `sync` pays, and
what separates the two is that `sync` also writes the result. `diff` reads like `list` — no writes, a filter, a printout
— but the work it does before printing is a network round trip per pair, and cost is what decides which side of the
prompt work belongs on ([OPS.md](OPS.md#cost-decides-which-side-of-the-gate-work-sits-on)). Both ops key their plan off
their own op name, so picking tools for a diff does not carry into a later sync.
