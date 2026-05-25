def --env packUv [] {
  let cmd = 'uv'
  if (
    (which $cmd | is-empty) or
    (PACK_MANAGER in $env and $env.PACK_MANAGER != $cmd) or
    (PACK_OP not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd { |n| packQueryPypi $n | is-not-empty } [$cmd tool install]
    }
    find => {
      for term in $env.PACK_FIND_NAMES {
        packQueryPypi $term | print
      }
    }
    list => {
      packOpList [$cmd tool list]
    }
    remove => {
      packOpRemove { |n| packInstalled [$cmd tool list] $n } [$cmd tool uninstall]
    }
    sync => {
      packOpSync [$cmd tool upgrade --all] [$cmd tool upgrade]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
