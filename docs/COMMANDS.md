# Command Ops & Matching

How a typed term resolves to targets. There are two questions a term can put to a name, and which one is asked depends
only on what the op does, never on which command it belongs to:

- **Acting ops take a name whole.** `add`, `rem`/`remove`, `sync`, `run`, `exec`, `diff` and `info` change or address
  one thing, so the term has to _be_ a name it goes by — its own name, a folder above it, or an alias. Part of a name is
  not a name: `nush` is not `nushell`, and `gl` is not `glass`. Case aside, nothing is normalised, so `lm-studio` and
  `lmstudio` are two names and a config that wants both states both.
- **Reading ops take the start of a word.** `find`, `list` and `outdated` exist to turn something half remembered into a
  name to type, so the term only has to start a word of one. A word is what sits between anything that is not a letter
  or a digit, so `go` finds `golang`, `golang.go` and `foo/golang`, and `tightvnc` finds `glavsoft.tightvnc`. The middle
  or the end of a word is never matched — `go` does not find `cargo` — and the term is taken as typed, its own
  separators included, so `studio` finds `lm-studio` and not `lmstudio`.

`sameName` and `wordStartsWith` in `src/match.ts` are the two primitives, `partsMatch` puts either to a path, and
`wutWordMatch` in `src/sh/nu/match.nu` is the second one again for the filters the client runs.

What a reading op reads is wider than a name, too. It looks at whatever could jog the name loose — a pack group's
aliases, the packages it holds and its `descr`, a file key's source paths — where an acting op never looks inside the
thing it is naming: a package a group holds is not a name for the group, and reaching the group through one would act on
everything else in it.

Nothing is ranked and nothing is reduced. Every match is a row of the table, and the numbered pick is where a run is
narrowed ([OPS.md](OPS.md#filter-summarise-ask-once)) — for `rem` exactly as for `add`. The two ops that can only do one
thing, `virt run` and a `script exec` naming a tool, take the first match in sorted order.

## A path is a name per level

Every command's targets live in a tree, and each level of it is a name: `cfg/pack/lang/go.yaml`,
`cfg/virt/<host>/qemu/glass.yaml`, `cfg/script/docker/setup.zsh`. A folder is a group of what it holds, so naming one
reaches all of it — `wut p a lang` is every group under `lang/`, `wut v a qemu` every qemu instance — and a term never
has to say where in the tree its level sits.

| Command  | Tree                           | Several terms                                                         |
| -------- | ------------------------------ | --------------------------------------------------------------------- |
| `pack`   | `<folder>/…/<group>`           | each is its own name: `wut p a nu zsh` is two groups                  |
| `virt`   | `<manager>/[<pod>/]<instance>` | all must match, in any order: `qemu glass` and `glass qemu` are one   |
| `script` | `<tool>/<action>`              | all must match; the cli reads action first, the tree is tool first    |
| `file`   | a key in `file.yaml`           | all must match the one key, through its own name, an alias, or a path |

A pack group's full name is its path joined with `-` (`lang-js-node`), and a term may name any run of whole levels of
it: `node`, `js`, `lang-js`, `js-node`.

## What each op asks

| Command  | A name, whole                   | The start of a word        |
| -------- | ------------------------------- | -------------------------- |
| `pack`   | `add`, `remove`, `sync`, `info` | `find`, `list`, `outdated` |
| `virt`   | `add`, `rem`, `sync`, `run`     | `find`, `list`             |
| `script` | `exec`                          | `find`                     |
| `file`   | `diff`, `sync`                  | `find`, `list`             |

`script exec` is the one op that splits on cardinality: `wut s e setup` runs every setup script gated for this machine,
while `wut s e setup ptyxis` names a tool and runs its one script. The `has_cmd` gate is client-side, so a fanned out
run skips tools that are not on the client's PATH, and `find` leaves them out of the listing — see
[SCRIPT.md](SCRIPT.md#the-clients-gates).

`pack list` and `pack outdated` put their term to what each manager reports installed, a line at a time, then hand the
term to the manager as well; `virt list` puts it to the instances that are installed. Both are the client's to answer,
so both go through `wutWordMatch`.

## The deeper search is a fallback

A pack name no group answers to is not dropped. It is handed to the managers as typed — `add`, `remove`, `sync` and
`info` ask each one whether it has it, and `find` offers to search them for it — and only for the names nothing in the
config matched ([PACK.md](PACK.md#finding)). The config is the first answer and the managers are the second, never both
at once.

## Nothing matched

A term that matches nothing is a no op, and every op says so rather than emitting a body that quietly does nothing:

| Command  | Message                          | When                                            |
| -------- | -------------------------------- | ----------------------------------------------- |
| `virt`   | `no instance matched: <filters>` | an add/rem/sync/run term named no instance      |
| `file`   | `no file matched: <filters>`     | a term named no config key                      |
| `script` | `no script matched: <filters>`   | an action, or action plus tool, named no script |

`find` ops are exempt: an empty result is the answer to a search, not a failure. `pack` and `virt` have no manager
filter to mismatch: the numbered prompt narrows the run instead, and it can only offer what the client actually has.

Example fixtures exercise the split: `virt add test` → `[test]` while `virt find test` → `[test, test2]`;
`pack add nush` is a loose name while `pack find nush` → `shell-nu`; `pack add shell` and `pack rem shell` → both shell
groups.
