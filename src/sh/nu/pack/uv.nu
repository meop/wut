def --env packUv [] {
  let cmd = 'uv'
  if (packSkip $cmd) {
    return
  }


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
      packOpAdd [$cmd tool install] --each
    }
    info => {
      for term in (packInfoNames) {
        let python = (getToolPython $term)
        if ($python | path exists) {
          packOp [$cmd pip show --python $python $term]
        } else {
          packPypiInfo $term
        }
      }
    }
    list => {
      packOpList (packListCmd $cmd)
    }
    remove => {
      packOpRemove [$cmd tool uninstall]
    }
    sync => {
      # uv manages pythons as well as tools: a bare sync moves each installed python to the newest patch of its minor
      # before the tools, which run on them
      if ((packNameList 'PACK_SYNC_NAMES') | is-empty) {
        packOp [$cmd python upgrade]
      }
      packOpSync [$cmd tool upgrade --all] [$cmd tool upgrade]
    }
    tidy => {
      packOp [$cmd cache clean]
    }
  }
}
