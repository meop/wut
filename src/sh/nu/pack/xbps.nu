def --env packXbps [] {
  let cmd = 'xbps'
  if (
    (which $"($cmd)-install" | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo)
  ) {
    return
  }

  let cmd = packElevate $cmd

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh 'xbps' }

  match $env.PACK_OP {
    add => {
      packOpAdd [$"($cmd)-install"]
    }
    info => {
      packOpInfo [$"($cmd)-query" --repository --show]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$"($cmd)-install" --dry-run --update]
    }
    remove => {
      packOpRemove [$"($cmd)-remove" --recursive]
    }
    sync => {
      packOpSync [$"($cmd)-install" --update] [$"($cmd)-install" --update]
    }
    tidy => {
      packOp [$"($cmd)-remove" --clean-cache --clean-cache]
      packOp [$"($cmd)-remove" --remove-orphans]
    }
  }
}
