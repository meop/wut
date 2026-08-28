def --env packXbps [] {
  let cmd = 'xbps'
  if (
    (which $"($cmd)-install" | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'xbps')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packElevate $cmd

  match $env.PACK_OP {
    add => {
      packOp [$"($cmd)-install" --sync]
      packOpAdd 'xbps' $"use xbps \(system\)" { |n| packGrepFind [$"($cmd)-query" --repository --search] $n } [$"($cmd)-install"]
    }
    info => {
      packOp [$"($cmd)-install" --sync]
      packOpInfo [$"($cmd)-query" --repository --show]
    }
    list => {
      packOpList [$"($cmd)-query" --list-pkgs]
    }
    outdated => {
      packOp [$"($cmd)-install" --sync]
      packOpOutdated [$"($cmd)-install" --dry-run --update]
    }
    remove => {
      packOpRemove 'xbps' $"use xbps \(system\)" { |n| packGrepList [$"($cmd)-query" --list-pkgs] $n } [$"($cmd)-remove" --recursive]
    }
    sync => {
      packOp [$"($cmd)-install" --sync]
      packOpSync [$"($cmd)-install" --update] [$"($cmd)-install" --update]
    }
    tidy => {
      packOp [$"($cmd)-remove" --clean-cache --clean-cache]
      packOp [$"($cmd)-remove" --remove-orphans]
    }
  }
}
