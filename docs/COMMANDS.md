# Command Ops & Matching

How commands resolve filter arguments to targets. The first half is a general, project-agnostic philosophy (safe to
share with other CLIs); the second half is this project's mapping.

## The problem

When a command selects targets by partial filters (substring, glob, path segments) rather than exact IDs, the open
question is what happens when a filter matches more than one thing. Left unspecified, every command answers differently
— run all, require exact, silently pick one, error. Collapse it to two behaviors and assign every op to one.

## Two philosophies

- **WIDE** — substring/fuzzy match, act on **all** results. No filter args = everything. Read, explore, and
  bulk-maintenance ops use this; the read ops double as the dry-run.
- **PINPOINT** — same fuzzy match, then reduce to **one**: (1) substring match, (2) prefer an exact match if any
  candidate has one, (3) take the **first** by a stable sort. "Do this one thing" ops use it.

Exact-match is only the tie-breaker inside PINPOINT — not a third philosophy. Don't add a "strict exact only" mode; it
kills abbreviation and refragments the model.

## Classifying an op

- Read-only or exploratory → **WIDE** (seeing extra is helpful, not harmful).
- Bulk / idempotent (sync, tidy, provision-all) → **WIDE**.
- Destructive or single-effect (remove, run, switch) → **PINPOINT** (acting on a set by accident is the failure mode).
- Complementary pairs differ only in cardinality: `add` is WIDE (provision all matching), `remove` is PINPOINT (take one
  out).

## Why it works

- No accidental fan-out on destructive ops.
- Abbreviation still works — exact-wins disambiguates when your shorthand is a prefix of something else (`gpu` beats
  `gpu-lite`).
- Discoverability is built in: when PINPOINT picks the wrong one, the matching WIDE op (or a global `--dry-run`) shows
  the candidates; add a filter term and retry. The loop is: explore wide → refine → act pinpoint.
- Multiple filter terms use AND semantics (every term must match), narrowing the candidate set before WIDE/PINPOINT
  decides cardinality.

## Implementation shape (language-agnostic)

```
preferExact(candidates, filters):
    for each filter term:
        exact = candidates where some segment == term
        if exact is non-empty: candidates = exact
    return candidates

pinpoint(candidates, filters):
    return first(preferExact(candidates, filters))
```

- WIDE returns the fuzzy-matched set; PINPOINT runs `pinpoint`.
- Share the resolver; let commands opt into pinpoint via a flag.
- Use a stable sort so "first" is deterministic across runs.
- If an op has extra eligibility rules, apply them before taking the first.

---

## This project (wut)

All ops use **AND semantics**: every filter term must match; more terms = narrower. Exception: `pack` takes a list of
names with OR semantics — each name is resolved independently.

| Command  | WIDE (substring, all)                                          | PINPOINT (exact-wins → first, one) |
| -------- | -------------------------------------------------------------- | ---------------------------------- |
| `script` | `find`                                                         | `exec`                             |
| `file`   | `find`, `diff`, `list`, `sync`                                 | —                                  |
| `pack`   | `find`, `add` (+ native-delegated: `list`, `outdated`, `sync`) | `remove`                           |
| `virt`   | `find`, `list`, `add`, `sync`, `tidy`                          | `rem`                              |

Primitives in `src/cfg.ts`: `preferExactMatches(parts, filters)` (exact-wins) and `pinpointMatch(parts, filters)`
(exact-wins then first). `getCfgDirDump` / `getCfgDirContent` take a `pinpoint` flag (used by `script exec`); `virt rem`
and `pack remove` apply pinpoint at their own layer, where podman-instance eligibility and group-name resolution differ
from a plain path glob. `pack list`/`outdated`/`sync` delegate matching to the native package manager.

Example fixtures exercise the split: `virt add qemu` → `[test, test2]` (WIDE) vs `virt rem qemu` → `[test]` (PINPOINT);
`pack add shell` → both shell groups vs `pack rem shell` → the first.
