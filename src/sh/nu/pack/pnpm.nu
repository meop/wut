const PACK_PNPM_RUNTIMES = ['bun' 'deno' 'node']

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
      let held = if ((packNameList 'PACK_SYNC_NAMES') | is-not-empty) { packSyncNames } else { packPnpmInstalled }
      # pnpm manages the node, bun and deno runtimes as well as packages, and records a runtime as the exact version
      # it installed, so `update` cannot move one: a runtime is set again at its latest release
      for r in ($held | where { |n| $n in $PACK_PNPM_RUNTIMES }) {
        packOp [$cmd runtime set $r latest --global]
      }
      let packages = ($held | where { |n| $n not-in $PACK_PNPM_RUNTIMES })
      if ($packages | is-not-empty) {
        packOp ([$cmd update --global --latest] ++ $packages)
      }
    }
    tidy => {
      packOp [$cmd store prune]
    }
  }
}
