# Command Ops & Matching

Every command (`script`, `file`, `pack`, `virt`) exposes a set of ops. Each op resolves its filter arguments through one
of two matching philosophies.

## Filter semantics

All ops use **AND semantics**: every provided filter term must match; more terms = narrower results.

Exception: `pack` takes a list of names with OR semantics — each name is resolved independently (single-argument pack
managers also loop per term, a tool limitation).

## Two philosophies

- **WIDE** — substring/glob match, act on **all** results. No filter args = everything. This is how read/explore and
  bulk ops behave; the read ops double as the dry-run.
- **PINPOINT** — substring/glob narrow → prefer an exact segment match → take the **first** sorted result, act on
  exactly **one**. Used by the "do this one thing" ops. Refine args (guided by a WIDE op, or the global dry-run flag) if
  you hit the wrong one.

`exact-wins` is only the tie-breaker inside PINPOINT, not its own philosophy.

## Op → philosophy

| Command  | WIDE (substring, all)                                          | PINPOINT (exact-wins → first, one) |
| -------- | -------------------------------------------------------------- | ---------------------------------- |
| `script` | `find`                                                         | `exec`                             |
| `file`   | `find`, `diff`, `list`, `sync`                                 | —                                  |
| `pack`   | `find`, `add` (+ native-delegated: `list`, `outdated`, `sync`) | `remove`                           |
| `virt`   | `find`, `list`, `add`, `sync`, `tidy`                          | `rem`                              |

`add` and its destructive counterpart (`rem`/`remove`) are deliberately complementary: `add` is WIDE (provision
everything matching), `rem` is PINPOINT (remove one). `pack list`/`outdated`/`sync` hand names to the native package
manager, which does its own matching.

## Implementation

Shared primitives live in `src/cfg.ts`:

- `preferExactMatches(parts, filters)` — narrows a result set to exact-segment matches when any exist, else returns the
  substring matches unchanged (the exact-wins step).
- `pinpointMatch(parts, filters)` — `preferExactMatches` then `.slice(0, 1)`.

`getCfgDirDump` / `getCfgDirContent` accept a `pinpoint` flag (used by `script exec`). `virt rem` and `pack remove`
apply pinpoint at their own layer, where podman-instance eligibility and group-name resolution differ from a plain path
glob.

The example configs under `cfg/` include sibling entries that exercise the split — e.g. `virt add qemu` →
`[test, test2]` (WIDE) vs `virt rem qemu` → `[test]` (PINPOINT); `pack add shell` → both shell groups vs
`pack rem shell` → the first.
