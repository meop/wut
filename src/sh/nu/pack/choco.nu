def --env packChoco [] {
  let cmd = 'choco'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(user/system\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
      packOpFind [$cmd search]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOpOutdated [$cmd outdated]
    }
    remove => {
      packOpRemove { |n| packGrepList [$cmd list] $n } [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd upgrade all] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd cache remove]
    }
  }
}
