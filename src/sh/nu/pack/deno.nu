def --env packDeno [] {
  let cmd = 'deno'
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

  def getBinDir [] {
    [$env.HOME '.deno' bin] | path join
  }

  def getInstalled [] {
    let dir = getBinDir
    if not ($dir | path exists) {
      return []
    }
    ls $dir | where type == dir | get name | path basename | str substring 1..
  }

  match $env.PACK_OP {
    add => {
      packOpAdd { |n| [(packQueryNpm $n), (packQueryJsr $n)] | flatten | is-not-empty } [$cmd install --force --global]
    }
    find => {
      for term in $env.PACK_FIND_NAMES {
        [(packQueryNpm $term), (packQueryJsr $term)] | flatten | print
      }
    }
    list => {
      packOpList [getInstalled]
    }
    remove => {
      packOpRemove { |n| [(getBinDir) $".($n)"] | path join | path exists } [$cmd uninstall --global]
    }
    sync => {
      let names = if ($env.PACK_SYNC_NAMES? | is-not-empty) {
        $env.PACK_SYNC_NAMES
      } else {
        getInstalled
      }
      for n in $names {
        opPrintMaybeRunCmd $cmd install --force --global $"($n)@latest"
      }
    }
    tidy => {
      packOp [$cmd clean]
    }
  }
}
