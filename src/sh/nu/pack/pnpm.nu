const PACK_PNPM_RUNTIMES = ['bun' 'deno' 'node']

# the runtimes pnpm holds globally, each with the major of the exact version it recorded
def --env packPnpmRuntimes [] {
  $env.PACK_PRINTED = '1'
  opPrintCmd pnpm list --global --json
  let deps = (try { ^pnpm list --global --json | from json | get -o 0.dependencies } catch { null }) | default {}
  $deps | transpose name info | where { |r| $r.name in $PACK_PNPM_RUNTIMES } | each { |r|
    { name: $r.name, major: ($r.info.version | split row '.' | first) }
  }
}

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
      # it installed, so `update` has no range to move one within. a runtime is set again at its installed major —
      # the newest release of it, the way uv's pythons stay within their minor — and only packages go to latest
      let runtimes = if ($held | any { |n| $n in $PACK_PNPM_RUNTIMES }) { packPnpmRuntimes } else { [] }
      for r in ($runtimes | where { |r| $r.name in $held }) {
        packOp [$cmd runtime set $r.name $r.major --global]
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
