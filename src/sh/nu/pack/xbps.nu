def --env packXbps [] {
  let cmd = 'xbps'
  if (packSkip $cmd $"($cmd)-install") {
    return
  }

  let cmd = packElevate $cmd

  packRefreshForOp 'xbps'

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
