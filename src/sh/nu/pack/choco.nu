def --env packChoco [] {
  let cmd = 'choco'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'choco')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(user/system\)") { return }

  match $env.PACK_OP {
    add => {
      packOpAdd 'choco' $"use choco \(user/system\)" { |n| packGrepFind [$cmd search] $n } [$cmd install]
    }
    find => {
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
      packOpRemove 'choco' $"use choco \(user/system\)" { |n| packGrepList [$cmd list] $n } [$cmd uninstall]
    }
    sync => {
      packOpSync [$cmd upgrade all] [$cmd upgrade]
    }
    tidy => {
      packOp [$cmd cache remove]
    }
  }
}
