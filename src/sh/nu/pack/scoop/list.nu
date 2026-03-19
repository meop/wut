def --env packScoopOp [cmd] {
  let filterArgs = $env.PACK_LIST_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  if ($filterArgs | is-not-empty) {
    opPrintMaybeRunCmd $cmd list '|' complete '|' get stdout '|' str trim --right ...$filterArgs
  } else {
    opPrintMaybeRunCmd $cmd list
  }
}
