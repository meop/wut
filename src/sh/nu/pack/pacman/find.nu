def --env packPacmanOp [cmd] {
  opPrintMaybeRunCmd $cmd --sync --search ...($env.PACK_FIND_NAMES? | default '' | split words)
}
