def --env packScoop [] {
  let bin = 'scoop'
  let cmd = (packScoopCmd)
  if (
    (which $bin | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $bin) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'scoop')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($bin) \(user\)") { return }

  if $env.PACK_OP in ['add', 'info', 'outdated', 'sync'] { packRefresh $bin }

  match $env.PACK_OP {
    add => {
      packOpAdd 'scoop' $"use scoop \(user\)" { |n| packGrepFind ($cmd ++ [search]) $n } ($cmd ++ [install])
    }
    info => {
      packOpInfo ($cmd ++ [info])
    }
    list => {
      packOpList ($cmd ++ [list])
    }
    outdated => {
      packOpOutdated ($cmd ++ [status])
    }
    remove => {
      packOpRemove 'scoop' $"use scoop \(user\)" { |n| packGrepList ($cmd ++ [list]) $n } ($cmd ++ [uninstall --purge])
    }
    sync => {
      packOpSync ($cmd ++ [update --all]) ($cmd ++ [update])
    }
    tidy => {
      packOp ($cmd ++ [cache rm --all])
      packOp ($cmd ++ [cleanup --all])
    }
  }
}
