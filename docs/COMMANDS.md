# Command Ops & Matching

How a filter argument resolves to targets. Every op is one of two behaviours, so a filter matching more than one thing
has one answer per op rather than a different one each time.

- **WIDE** — substring match, act on **all** results. No filter args = everything. Read, explore and bulk-idempotent ops
  (`find`, `list`, `add`, `sync`, `tidy`) use it, and the read ops double as the dry run.
- **PINPOINT** — the same substring match, then reduced to **one**: prefer a candidate with an exact segment match, else
  take the first by stable sort. Destructive or single-effect ops (`remove`, `rem`, a named `exec`) use it, since acting
  on a set by accident is the failure mode there.

Exact-match is the tie-breaker inside PINPOINT, not a third mode: it is what lets an abbreviation still work when it is
also a prefix of something else (`gpu` beats `gpu-lite`). When PINPOINT picks the wrong one, the matching WIDE op shows
the candidates — explore wide, add a filter term, act pinpoint.

`preferExactMatches(parts, filters)` and `pinpointMatch(parts, filters)` in `src/cfg.ts` are the two primitives.

## This project (wut)

All ops use **AND semantics**: every filter term must match; more terms = narrower. Exception: `pack` takes a list of
names with OR semantics — each name is resolved independently.

| Command  | WIDE (substring, all)                                          | PINPOINT (exact-wins → first, one) |
| -------- | -------------------------------------------------------------- | ---------------------------------- |
| `script` | `find`, `exec` (action alone)                                  | `exec` (action + tool)             |
| `file`   | `find`, `diff`, `list`, `sync`                                 | —                                  |
| `pack`   | `find`, `add` (+ native-delegated: `list`, `outdated`, `sync`) | `remove`                           |
| `virt`   | `find`, `list`, `add`, `sync`, `tidy`                          | `rem`, `run`                       |

`script exec` is the one op that splits on cardinality: `wut s e setup` runs every setup script gated for this machine,
while `wut s e setup ptyxis` names a tool and pinpoints to one. The cli reads action first; the config tree is tool
first (`ptyxis/setup.zsh`), so `script` reverses its filters before globbing. The `has_cmd` gate is client-side, so a
fanned out run skips tools that are not on the client's PATH, and `find` leaves them out of the listing — see
[SCRIPT.md](SCRIPT.md#has_cmd-is-the-clients).

`script exec`, `virt rem`, `virt run` and `pack remove` apply pinpoint at their own layer — script over the union of all
three shells' matches, so a tool present in more than one shell still resolves to a single script, and podman-instance
eligibility and group-name resolution differ from a plain path glob. `pack list`/`outdated`/`sync` delegate matching to
the native package manager.

## Nothing matched

A filter that matches nothing is a no op, and every op says so rather than emitting a body that quietly does nothing:

| Command  | Message                          | When                                                  |
| -------- | -------------------------------- | ----------------------------------------------------- |
| `pack`   | `manager not supported: <name>`  | `-m` names a manager this client has no support for   |
| `virt`   | `manager not supported: <name>`  | same                                                  |
| `virt`   | `no instance matched: <filters>` | an add/rem/sync filter resolved to no instance        |
| `file`   | `no file matched: <filters>`     | a filter resolved to no config key                    |
| `script` | `no script matched: <filters>`   | an action, or action plus tool, resolved to no script |

`find` ops are exempt: an empty result is the answer to a search, not a failure. Note the asymmetry this fixes — an
unmatched `-m` used to leave an **empty** manager list, which then read as "no list to filter by" and listed every
group, including names for managers the client cannot use.

Example fixtures exercise the split: `virt add qemu` → `[test, test2]` (WIDE) vs `virt rem qemu` → `[test]` (PINPOINT);
`pack add shell` → both shell groups vs `pack rem shell` → the first.
