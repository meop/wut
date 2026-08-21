def --env packUv [] {
  let cmd = 'uv'
  if (
    (which $cmd | is-empty) or
    ('PACK_MANAGER' in $env and $env.PACK_MANAGER != $cmd) or
    ('PACK_OP' not-in $env) or
    (packNothingToDo 'uv')
  ) {
    return
  }

  if ($env.PACK_OP not-in ['add', 'remove']) and not (packPrompt $"use ($cmd) \(user\)") { return }

  # uv doesn't expose a per-tool info command, but each tool is just an
  # isolated venv under `uv tool dir`/<name> (undocumented as a stable path,
  # but real and inspectable — the same pip metadata `uv pip show` reads
  # anywhere else) with a standard venv layout, so pointing pip show at that
  # tool's own interpreter reports on exactly what's actually installed.
  def getToolPython [name: string] {
    let dir = [(^$cmd tool dir | str trim) $name] | path join
    if $nu.os-info.name == windows {
      [$dir Scripts python.exe] | path join
    } else {
      [$dir bin python] | path join
    }
  }

  match $env.PACK_OP {
    add => {
      packOpAdd 'uv' $"use uv \(user\)" { |n| packHttpGetPypi $n | is-not-empty } [$cmd tool install] --each
    }
    find => {
      for term in $env.PACK_FIND_NAMES {
        packHttpGetPypi $term | print
      }
    }
    info => {
      for term in $env.PACK_INFO_NAMES {
        packOp [$cmd pip show --python (getToolPython $term) $term]
      }
    }
    list => {
      packOpList [$cmd tool list]
    }
    remove => {
      packOpRemove 'uv' $"use uv \(user\)" { |n| packGrepList [$cmd tool list] $n } [$cmd tool uninstall]
    }
    sync => {
      packOpSync [$cmd tool upgrade --all] [$cmd tool upgrade]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
