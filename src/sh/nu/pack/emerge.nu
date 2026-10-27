def --env packEmerge [] {
  let mgr = 'emerge'
  if (packSkip $mgr) {
    return
  }

  let cmd = packElevate $mgr

  packRefreshForOp $mgr

  match $env.PACK_OP {
    add => {
      # --noreplace: a name already here is recorded in world, not rebuilt
      packOpAdd [$cmd --noreplace]
    }
    info => {
      # a bare term is a prefix to --search, so git answers with git-lfs and two dozen more; a % prefix makes it a
      # regex, which the anchors pin to the one name, and @ matches it against category/name, which a whole name is
      for term in (packInfoNames) {
        let key = if ($term | str contains '/') { $"%@^($term)$" } else { $"%^($term)$" }
        packDo [$cmd --search $key]
      }
    }
    list => {
      packOpList (packListCmd $mgr)
    }
    outdated => {
      packOpOutdated [$cmd --pretend --update --deep --newuse '@world']
    }
    remove => {
      # depclean with a name unmerges it and drops it from world, and refuses while anything still depends on it
      packOpRemove [$cmd --depclean]
    }
    sync => {
      packOpSync [$cmd --update --deep --newuse '@world'] [$cmd --update]
    }
    tidy => {
      packOp [$cmd --depclean]
    }
  }
}
