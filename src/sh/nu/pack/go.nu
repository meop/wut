# go installs a tool from its package path (golang.org/x/tools/gopls), built from source into its bin dir. a name with
# no version installs the latest release: `go install` refuses a bare path outside a module
def packGoVersioned [name: string] {
  if ($name | str contains '@') { $name } else { $"($name)@latest" }
}

def --env packGo [] {
  let cmd = 'go'
  if (packSkip $cmd) {
    return
  }


  match $env.PACK_OP {
    add => {
      for n in (packNameList 'PACK_ADD_NAMES') {
        packOpStrict [$cmd install (packGoVersioned $n)]
      }
      load-env {PACK_ADD_NAMES: []}
    }
    info => {
      let tools = (packGoTools)
      for term in (packInfoNames) {
        let tool = ($tools | where { |t| packGoNamed $t $term } | get -o 0)
        if $tool != null {
          packDo [$cmd version -m $tool.bin]
        } else {
          packDo [$cmd list -m -json (packGoVersioned $term)]
        }
      }
    }
    list => {
      # nu code, like deno's listing: a wut function does not exist in the fresh `nu -c` packOpList runs
      let terms = (packNameList 'PACK_LIST_NAMES')
      for t in (packGoTools) {
        if ($terms | is-empty) or ($terms | any { |term| $t.path | str contains --ignore-case $term }) {
          opPrint $"($t.path) ($t.version)"
        }
      }
    }
    outdated => {
      let terms = (packNameList 'PACK_OUTDATED_NAMES')
      for t in (packGoTools) {
        if ($terms | is-not-empty) and not ($terms | any { |term| $t.path | str contains --ignore-case $term }) {
          continue
        }
        let latest = (^$cmd list -m -f '{{.Version}}' $"($t.module)@latest" | complete | get stdout | str trim)
        if ($latest | is-not-empty) and $latest != $t.version {
          opPrint $"($t.path) ($t.version) -> ($latest)"
        }
      }
    }
    remove => {
      # go has no uninstall: a tool is the one binary it built
      let tools = (packGoTools)
      for n in (packNameList 'PACK_REMOVE_NAMES') {
        for t in ($tools | where { |t| packGoNamed $t $n }) {
          packOpStrict [rm $t.bin]
        }
      }
      load-env {PACK_REMOVE_NAMES: []}
    }
    sync => {
      # go's install is its update, so a name it does not already have would be installed rather than updated: the
      # tools are whatever it holds, narrowed by what was asked for
      let asked = (packNameList 'PACK_SYNC_NAMES')
      let tools = (packGoTools | where { |t| ($asked | is-empty) or ($asked | any { |n| packGoNamed $t $n }) })
      for t in $tools {
        packOp [$cmd install $"($t.path)@latest"]
      }
    }
    tidy => {
      # the build cache trims itself; the module cache keeps every download until it is cleaned
      packOp [$cmd clean -modcache]
    }
  }
}
