def --env packBun [] {
  let cmd = 'bun'
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
      opPrintMaybeRunCmd $cmd add -g $env.PACK_ADD_NAMES
      hide-env PACK_ADD_NAMES
    }
    'find' => {
      for term in $env.PACK_FIND_NAMES {
        [(packQueryNpm $term), (packQueryJsr $term)] | flatten | print
      }
    }
    'list' => {
      packOpList [$cmd pm ls -g]
    }
    'rem' => {
      packOpRem [$cmd pm ls -g] [$cmd remove -g]
    }
    'tidy' => {
      packOpTidy [$cmd pm cache rm]
    }
  }
}
