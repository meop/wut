def --env packBrew [] {
  let cmd = 'brew'
  if ('PACK_MANAGER' not-in $env or $env.PACK_MANAGER == $cmd) and (which $cmd | is-not-empty) {
    if not (('PACK_OP' in $env) and ($env.PACK_OP in ['add', 'rem']) and ($env.PACKED? | default false)) {
      mut yn = ''
      if 'YES' in $env {
        $yn = 'y'
      } else {
        $yn = input $"? use ($cmd) \(system\) [y, [n]]: "
      }
      if $yn != 'n' {
        if 'PACK_OP' in $env and ($env.PACK_OP == 'add' or $env.PACK_OP == 'find' or $env.PACK_OP == 'out' or $env.PACK_OP == 'sync') {
          opPrintMaybeRunCmd $cmd update '|' complete '|' ignore
        }
        packBrewOp $cmd
      }
    }
  }
}
