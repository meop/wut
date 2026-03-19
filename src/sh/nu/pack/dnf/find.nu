def --env packDnfOp [cmd] {
  opPrintMaybeRunCmd $cmd search ...($env.PACK_FIND_NAMES? | default '' | split words)
}
