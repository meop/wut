def --env packXbps [] {
  let cmd = 'xbps'
  if (
    (which $"($cmd)-install" | is-empty) or
    (PACK_MANAGER in $env and $env.PACK_MANAGER != $cmd) or
    (PACK_OP not-in $env) or
    ($env.PACK_OP == add and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == remove and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packSudoCmd $cmd

  match $env.PACK_OP {
    add => {
      packOp [$"($cmd)-install" --sync]
      packOpAdd { |n| packSearch [$"($cmd)-query" --repository --search] $n } [$"($cmd)-install"]
    }
    find => {
      packOp [$"($cmd)-install" --sync]
      packOpFind [$"($cmd)-query" --repository --search]
    }
    list => {
      packOpList [$"($cmd)-query" --list-pkgs]
    }
    outdated => {
      packOp [$"($cmd)-install" --sync]
      packOpOutdated [$"($cmd)-install" --dry-run --update]
    }
    remove => {
      packOpRemove { |n| packInstalled [$"($cmd)-query" --list-pkgs] $n } [$"($cmd)-remove" --recursive]
    }
    sync => {
      packOp [$"($cmd)-install" --sync]
      packOpSync [$"($cmd)-install" --update] [$"($cmd)-install" --update]
    }
    tidy => {
      opPrintMaybeRunCmd $"($cmd)-remove" --clean-cache --clean-cache
      opPrintMaybeRunCmd $"($cmd)-remove" --remove-orphans
    }
  }
}
