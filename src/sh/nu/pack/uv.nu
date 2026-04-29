def --env packUv [] {
  let cmd = 'uv'
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

  match $env.PACK_OP {
    'add' => {
      mut toAdd = []
      for term in $env.PACK_ADD_NAMES {
        if (packQueryPypi $term | is-not-empty) {
          $toAdd = ($toAdd | append $term)
        } else {
          print $"($term): not found on PyPI"
        }
      }
      if ($toAdd | is-not-empty) {
        opPrintMaybeRunCmd $cmd tool install $toAdd
      }
      let remains = ($env.PACK_ADD_NAMES | where { |n| $n not-in $toAdd })
      if ($remains | is-empty) {
        hide-env PACK_ADD_NAMES
        return
      }
      $env.PACK_ADD_NAMES = $remains
    }
    'find' => {
      for term in $env.PACK_FIND_NAMES {
        packQueryPypi $term | print
      }
    }
    'list' => {
      packOpList [$cmd tool list]
    }
    'rem' => {
      packOpRem [$cmd tool list] [$cmd tool uninstall]
    }
    'sync' => {
      packOpSync [$cmd tool upgrade --all] [$cmd tool upgrade]
    }
    'tidy' => {
      packOpTidy [$cmd cache clean]
    }
  }
}
