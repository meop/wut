const PACK_PNPM_RUNTIMES = ['bun' 'deno' 'node']

# pnpm runs no package itself: a package's command runs on the node beside it in pnpm's bin dir, and only on one PATH
# finds when pnpm holds none. so a pnpm with packages and no node of its own runs them on another install's. its
# runtimes are asked where pnpm keeps them, since PATH may well find another node first and that is fine: pnpm's
# packages never look there
def --env packPnpmHeld [] {
  let res = (packAsk [pnpm bin --global])
  if $res.exit_code != 0 {
    return (packHeld '' 'pnpm names no global bin dir')
  }
  let bin = ($res.stdout | str trim)
  let held = (packPnpmInstalled)
  let runtimes = ($held | where { |n| $n in $PACK_PNPM_RUNTIMES })
  if 'node' not-in $runtimes and ($held | any { |n| $n not-in $PACK_PNPM_RUNTIMES }) {
    return (packHeld '' 'pnpm holds no node for its packages' ['pnpm runtime set node latest --global'])
  }
  if ($held | is-not-empty) and not (($env.PACK_SHELL_PATH? | default $env.PATH) | any { |p| ($p | path expand) == ($bin | path expand) }) {
    return (packHeld '' "pnpm's bin dir is not on PATH" [$bin])
  }
  let notes = ($runtimes | each { |r|
    let own = ($bin | path join $r)
    # shown by name where that is the one PATH finds, as every check is
    let ask = if (packShellWhich $r) == $own { $r } else { $own }
    $"($r) (packVersionOf (packAsk [$ask --version] | get stdout))"
  })
  packHeld ($notes | str join ', ')
}

def --env packPnpm [] {
  let cmd = 'pnpm'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      # a package's command runs on pnpm's own node, so a pnpm that holds none gets one before its first package
      let names = (packNameList 'PACK_ADD_NAMES')
      if ($names | any { |n| $n not-in $PACK_PNPM_RUNTIMES }) and 'node' not-in $names and 'node' not-in (packPnpmInstalled) {
        packOpStrict [$cmd runtime set node latest --global]
      }
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
