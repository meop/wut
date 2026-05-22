def --env packPacman [] {
  let mgr = if 'PACK_MANAGER' in $env {
    $env.PACK_MANAGER
  } else if (which yay | is-not-empty) {
    'yay'
  } else if (which paru | is-not-empty) {
    'paru'
  } else {
    'pacman'
  }
  if (
    ($mgr not-in ['yay', 'paru', 'pacman']) or
    (which $mgr | is-empty) or
    ('PACK_OP' not-in $env) or
    ($env.PACK_OP == 'add' and ($env.PACK_ADD_NAMES? | is-empty)) or
    ($env.PACK_OP == 'remove' and ($env.PACK_REMOVE_NAMES? | is-empty))
  ) {
    return
  }

  if not (packPrompt $"use ($mgr) \(system\)") { return }
  let cmd = if $mgr == 'pacman' { packSudoCmd $mgr } else { $mgr }

  match $env.PACK_OP {
    'add' => {
      packOp [$cmd --sync --refresh]
      packOpAdd { |n| packSearch [$cmd --sync --search] $n } [$cmd --sync --needed]
    }
    'find' => {
      packOp [$cmd --sync --refresh]
      packOpFind [$cmd --sync --search]
    }
    'list' => {
      packOpList [$cmd --query]
    }
    'outdated' => {
      packOp [$cmd --sync --refresh]
      packOpOutdated [$cmd --query --upgrades]
    }
    'remove' => {
      packOpRemove { |n| packInstalled [$cmd --query] $n } [$cmd --remove --nosave --recursive]
    }
    'sync' => {
      packOp [$cmd --sync --refresh]
      packOpSync [$cmd --sync --sysupgrade] [$cmd --sync --needed]
    }
    'tidy' => {
      # https://gitlab.archlinux.org/pacman/pacman/-/issues/297
      opPrintMaybeRunCmd sudo find /var/cache/pacman/pkg/ -mindepth 1 -type d -empty -delete
      opPrintMaybeRunCmd $cmd --sync --clean --clean
      opPrintMaybeRunCmd $cmd --query --deps --unrequired --quiet '|' $cmd --remove --nosave --recursive '-'
    }
  }
}
