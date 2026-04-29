def --env packXbps [] {
  let cmd = 'xbps'
  if (
    (which $"($cmd)-install" | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'rem' and ($env.PACK_REM_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($cmd) \(system\)") { return }
  let cmd = packSudoCmd $cmd

  match $env.PACK_OP {
    'add' => {
      packOpUp [$"($cmd)-install" --sync]
      packOpAdd [$"($cmd)-query" --repository --search] [$"($cmd)-install"]
    }
    'find' => {
      packOpUp [$"($cmd)-install" --sync]
      packOpFind [$"($cmd)-query" --repository --search]
    }
    'list' => {
      packOpList [$"($cmd)-query" --list-pkgs]
    }
    'out' => {
      packOpUp [$"($cmd)-install" --sync]
      packOpOut [$"($cmd)-install" --dry-run --update]
    }
    'rem' => {
      packOpRem [$"($cmd)-query" --list-pkgs] [$"($cmd)-remove" --recursive]
    }
    'sync' => {
      packOpUp [$"($cmd)-install" --sync]
      packOpSync [$"($cmd)-install" --update] [$"($cmd)-install" --update]
    }
    'tidy' => {
      opPrintMaybeRunCmd $"($cmd)-remove" --clean-cache --clean-cache
      opPrintMaybeRunCmd $"($cmd)-remove" --remove-orphans
    }
  }
}
