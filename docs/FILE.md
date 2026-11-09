# File: keys, directories, and the one op that writes

How `file` maps config into place. The `file.yaml` shape — `maps`, `permission`, template substitution — is in
[RULES.md](RULES.md#fileyaml-structure); the shape shared with every other command is in [OPS.md](OPS.md).

## A key is its own bin check

A `file.yaml` key is the tool's name and the binary `fileBinHere` looks for: `zed` is present if `zed` is on PATH, so a
config for something not installed is skipped rather than written. A key has no other names — one that needs to answer
to a second binary is a second key.

The key travels to the client as `zed|settings.json` — the name to check on the left, the `in` paths on the right — and
is what `find` prints as a heading.

## Five ops, the same as pack's

The ops mean what pack's do, for a tool's files rather than its package. A term names a tool by its key: `sync` and
`remove` take it whole, `find`, `list` and `outdated` the start of a word of it, or of a source path
([COMMANDS.md](COMMANDS.md)).

| op         | answers                                             | reads        | asks first |
| ---------- | --------------------------------------------------- | ------------ | ---------- |
| `find`     | what the config has for the tools here              | the config   | no         |
| `list`     | what is in place on this machine                    | the disk     | no         |
| `outdated` | what a sync would write or take out, with its diffs | config, disk | yes        |
| `sync`     | writes only that                                    | config, disk | yes        |
| `remove`   | takes out what sync wrote                           | the disk     | yes        |

`find`, `list`, `outdated` and `sync` act on the tools here (`fileBinHere`). `remove` acts on the tools whose files are
on disk, whether or not the tool still is: pack removes a tool's files before the tool, and `wut f rem <key>` takes back
what is left after one went some other way.

## Sync writes only what changed

`sync` fetches each source and compares it with its destination by their bytes, and writes only a file that is new or
changed. A `maps` entry whose `in` is a directory expands to every file inside it, and a file in its destination that
the source no longer has is taken out, so the folder ends the same as the source without being cleared and written
again. `permission` blocks are applied after a tool's writes, as chmod on unix and ACL commands on windows
(`getPlatAclPermCmds`), and only for a tool that had one: a sync with nothing to change writes nothing at all, which is
what keeps repeated syncs off an SSD. What it left alone it counts, `zsh: 12 unchanged`.

`outdated` is the same comparison, said instead of done: each file that is `new` or `changed`, the diff of a changed one
(`diff`, or `fc`), and each `stale` file a sync would take out. Its fetches cost what sync's do, a GET per file, so it
asks which tools first, through the same `filePlanShow`
([OPS.md](OPS.md#cost-decides-which-side-of-the-gate-work-sits-on)). Each op keys its plan off its own name, so tools
picked for an outdated do not carry into a later sync.

`remove` takes out a folder map's destination whole, since sync made it the source's, and each file a tool was written
elsewhere, and leaves every other tool's alone.

## A pack's own files

A `file.yaml` key named for a pack group is that pack's own, the way a script directory is: pack writes it after the
install and before `setup`, writes it again on a sync before the `sync` script, and removes it after `teardown`, through
the same functions, so a pack writes a tool's files exactly as `wut f s <key>` would
([PACK.md](PACK.md#a-groups-own-files)).
