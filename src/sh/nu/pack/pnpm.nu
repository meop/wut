def --env packPnpm [] {
  let cmd = 'pnpm'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd add --global]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    outdated => {
      packOpOutdated [$cmd outdated --global]
    }
    remove => {
      packOpRemove [$cmd remove --global]
    }
    sync => {
      # pnpm installs the runtimes it manages into the same global store; updating those is `pnpm env`, not this
      let names = if ((packNameList 'PACK_SYNC_NAMES') | is-not-empty) {
        packSyncNames
      } else {
        (packPnpmInstalled) | where { $in != 'bun' and $in != 'deno' and $in != 'node' }
      }
      if ($names | is-not-empty) {
        packOp ([$cmd update --global --latest] ++ $names)
      }
    }
    tidy => {
      packOp [$cmd store prune]
    }
  }
}
