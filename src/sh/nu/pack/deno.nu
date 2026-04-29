def --env packDeno [] {
  let cmd = 'deno'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'rem' and ($env.PACK_REM_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  def getBinDir [] {
    if $nu.os-info.name == 'windows' {
      [$env.LOCALAPPDATA 'deno' 'bin'] | path join
    } else {
      [$env.HOME '.deno' 'bin'] | path join
    }
  }

  match $env.PACK_OP {
    'add' => {
      opPrintMaybeRunCmd $cmd install -g $env.PACK_ADD_NAMES
      hide-env PACK_ADD_NAMES
    }
    'find' => {
      for term in $env.PACK_FIND_NAMES {
        [(packQueryNpm $term), (packQueryJsr $term)] | flatten | print
      }
    }
    'list' => {
      packOpList ['ls' (getBinDir)]
    }
    'rem' => {
      packOpRem ['ls' (getBinDir)] [$cmd uninstall -g]
    }
    'tidy' => {
      packOpTidy [$cmd clean]
    }
  }
}
