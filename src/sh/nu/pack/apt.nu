def --env packApt [] {
  let mgr = 'apt'
  if (packSkip $mgr) {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      packOpAdd [$cmd install]
    }
    info => {
      packOpInfo [$cmd show]
    }
    list => {
      # nu code, like go's and deno's listings: a wut function does not exist in the fresh `nu -c` packOpList runs
      let terms = (packNameList 'PACK_LIST_NAMES')
      for l in (packAptInstalled) {
        if ($terms | is-empty) or ($terms | any { |term| wutWordMatch $l $term }) {
          opPrint $l
        }
      }
    }
    outdated => {
      packOpOutdated [$cmd list --upgradable]
    }
    remove => {
      packOpRemove [$cmd purge --autoremove]
    }
    sync => {
      packOpSync [$cmd full-upgrade] [$cmd install]
    }
    tidy => {
      packOp [$cmd clean]
      packOp [$cmd autoremove --purge]
    }
  }
}
