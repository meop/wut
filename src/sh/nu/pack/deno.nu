def --env packDeno [] {
  let cmd = 'deno'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install --force --global] --each
    }
    info => {
      for term in $env.PACK_INFO_NAMES {
        packDo [$cmd info $"npm:($term)"]
        packDo [$cmd info $"jsr:($term)"]
      }
    }
    list => {
      packOpList [packDenoInstalled]
    }
    remove => {
      packOpRemove [$cmd uninstall --global] --each
    }
    sync => {
      let names = if ($env.PACK_SYNC_NAMES? | is-not-empty) {
        $env.PACK_SYNC_NAMES
      } else {
        packDenoInstalled
      }
      for n in $names {
        packOp [$cmd install --force --global $"($n)@latest"]
      }
    }
    tidy => {
      packOp [$cmd clean]
    }
  }
}
