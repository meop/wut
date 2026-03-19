def --env packBrewOp [cmd] {
  let filterArgs = $env.PACK_OUT_NAMES | split words | each { |t| ['|', 'find', '--ignore-case', $t] } | flatten
  opPrintMaybeRunCmd do --ignore-errors '{' $cmd outdated ...$filterArgs '}'
}
