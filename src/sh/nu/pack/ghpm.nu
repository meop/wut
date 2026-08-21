def --env packGhpm [] {
  let cmd = 'ghpm'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'ghpm')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and not (packPrompt $"use ($cmd) \(user\)") { return }

  match $env.PACK_OP {
    add => {
      packOp [$cmd refresh]
      packOpAdd 'ghpm' $"use ghpm \(user\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
      packOp [$cmd refresh]
      packOpFind [$cmd search]
    }
    info => {
      packOpInfo [$cmd info]
    }
    list => {
      packOpList [$cmd list]
    }
    outdated => {
      packOpOutdated [$cmd outdated]
    }
    remove => {
      packOpRemove 'ghpm' $"use ghpm \(user\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd sync] [$cmd sync]
    }
    tidy => {
      packOp [$cmd tidy]
    }
  }
}
