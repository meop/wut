def --env packXbps [] {
  let mgr = 'xbps'
  if (packSkip $mgr $"($mgr)-install") {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      packOpAdd [$"($cmd)-install"]
    }
    info => {
      packOpInfo [$"($cmd)-query" --repository --show]
    }
    list => {
      packOpList (packListCmd $mgr)
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
