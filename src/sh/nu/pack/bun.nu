def --env packBun [] {
  let cmd = 'bun'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd { |n| [(packHttpGetNpm $n), (packHttpGetJsr $n)] | flatten | is-not-empty } [$cmd add --force --global]
    }
    find => {
      for term in $env.PACK_FIND_NAMES {
        [(packHttpGetNpm $term), (packHttpGetJsr $term)] | flatten | print
      }
    }
    list => {
      packOpList [$cmd list --global]
    }
    remove => {
      packOpRemove { |n| packGrepList [$cmd list --global] $n } [$cmd remove --global]
    }
    sync => {
      packOpSync [$cmd update --force --global --latest] [$cmd update --force --global --latest]
    }
    tidy => {
      packOp [$cmd pm cache rm]
    }
  }
}
