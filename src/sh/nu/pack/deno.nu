def --env packDeno [] {
  let cmd = 'deno'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'deno')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and ('PACK_AGREED' not-in $env) and not (packPrompt $"use ($cmd) \(user\)") { return }

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
      packOpAdd 'deno' $"use deno \(user\)" { |n| [(packHttpGetNpm $n), (packHttpGetJsr $n)] | flatten | is-not-empty } [$cmd install --force --global] --each
    }
    info => {
      for term in $env.PACK_INFO_NAMES {
        packDo [$cmd info $"npm:($term)"]
        packDo [$cmd info $"jsr:($term)"]
      }
    }
    list => {
      packOpList [getInstalled]
    }
    remove => {
      packOpRemove 'deno' $"use deno \(user\)" { |n| [(getBinDir) $".($n)"] | path join | path exists } [$cmd uninstall --global] --each
    }
    sync => {
      let names = if ($env.PACK_SYNC_NAMES? | is-not-empty) {
        $env.PACK_SYNC_NAMES
      } else {
        getInstalled
      }
      for n in $names {
        packOp [$cmd install --force --global $"($n)@latest"]
      }
    }
    tidy => {
      packOp [$cmd clean]
    }
  }
}
