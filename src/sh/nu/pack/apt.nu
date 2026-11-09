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
      # a term pipes the listing through find, and apt warns any listing not written to a terminal that its output
      # is for people: the same rows as at a terminal, so the warning says nothing here
      packOpOutdated [$cmd -o Apt::Cmd::Disable-Script-Warning=true list --upgradable]
    }
    remove => {
      packOpRemove [$cmd purge --autoremove]
    }
    renew => {
      packOpRenew [$cmd install --reinstall]
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
