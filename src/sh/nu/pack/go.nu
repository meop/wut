# go installs a tool from its package path (golang.org/x/tools/gopls), built from source into its bin dir. a name with
# no version installs the latest release: `go install` refuses a bare path outside a module
def packGoVersioned [name: string] {
  if ($name | str contains '@') { $name } else { $"($name)@latest" }
}

# the newest release of a tool's module, asked of the module proxy. empty when it cannot say
def packGoLatest [tool: record] {
  ^go list -m -f '{{.Version}}' $"($tool.module)@latest" | complete | get stdout | str trim
}

# the toolchain a build would use now, spelled as a binary records the one that built it. asked from the home dir:
# go answers for the toolchain a go.mod above the cwd asks for, and `go install path@latest` does not read that file
def packGoToolchain [] {
  do { cd ($env.HOME? | default $nu.home-dir); ^go env GOVERSION | complete | get stdout | str trim }
}

# a toolchain's release as one number, so two can be put in order. an experiment hangs off the release
# (go1.27.2-X:nodwarf5) and is not part of it, a release candidate comes before its release, and a toolchain that is
# not a release at all (a devel build) is 0
def packGoRelease [toolchain: string] {
  let m = ($toolchain | parse --regex '^go(?<major>\d+)\.(?<minor>\d+)(?:\.(?<patch>\d+))?(?<pre>rc|beta)?' | get -o 0)
  if $m == null {
    return 0
  }
  let release = (($m.major | into int) * 1000000 + ($m.minor | into int) * 1000 + ($m.patch | default '0' | into int))
  $release * 2 + (if $m.pre == null { 1 } else { 0 })
}

# older, not different: with GOTOOLCHAIN=auto a module that asks for a newer go than the one installed is built by a
# toolchain go downloads for it, and that tool is ahead of this one rather than behind it
def packGoOlder [built: string, toolchain: string] {
  let release = (packGoRelease $built)
  $release > 0 and $release < (packGoRelease $toolchain)
}

# the go gotm puts down: a shim in gotm's own bin dir
def packGotmGo [] {
  let ext = if $nu.os-info.name == 'windows' { '.exe' } else { '' }
  [($env.HOME? | default $nu.home-dir) .gotm bin $"go($ext)"] | path join
}

# whether the go on PATH is gotm's. by the directory PATH found it in, not by what it links to: gotm's go is a shim
def packGoOwned [] {
  let go = (which go | get -o 0.path)
  $go != null and ($go | path dirname) == (packGotmGo | path dirname)
}

# go and gofmt are one install. a go is a row wherever PATH has it — gotm's, a distro's — and runs with its own dir
# first, so the gofmt and the toolchain it builds with are its own
def --env packGoHeld [] {
  let go = (which go | get -o 0.path)
  let gofmt = (which gofmt | get -o 0.path)
  if $gofmt != null and ($gofmt | path dirname) != ($go | path dirname) {
    return (packHeld '' "gofmt is another install's" [$"go ($go)" $"gofmt ($gofmt)"])
  }
  let res = (packAsk [go env GOVERSION] --home)
  if $res.exit_code != 0 {
    return (packHeld '' 'go does not run' [$"go ($go)"])
  }
  let by = if (packGoOwned) { ' (gotm)' } else { '' }
  packHeld $"go (packVersionOf $res.stdout)($by)"
}

# gotm manages go's toolchains the way rustup manages rust's, and is its own tool rather than a package. where the go
# on PATH is gotm's, the toolchains it was asked to keep move before the tools rebuild against them. a go another
# manager delivered has no gotm behind it, and is that manager's to update, even with a gotm on PATH beside it
def --env packGotmUpdate [] {
  let gotm = (which gotm | get -o 0.path)
  if $gotm != null and (packGoOwned) {
    packSelfUpdate 'gotm' $gotm [sync]
  }
}

# gotm keeps every archive it downloaded, and whatever a failed install left behind, until asked: its own tidy is the
# only thing that lets them go, as ghpm's is
def --env packGotmTidy [] {
  if (which gotm | is-not-empty) {
    packOp [gotm tidy]
  }
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
        if ($terms | is-empty) or ($terms | any { |term| wutWordMatch $t.path $term }) {
          opPrint $"($t.path) ($t.version)"
        }
      }
    }
    outdated => {
      let terms = (packNameList 'PACK_OUTDATED_NAMES')
      let toolchain = (packGoToolchain)
      for t in (packGoTools) {
        if ($terms | is-not-empty) and not ($terms | any { |term| wutWordMatch $t.path $term }) {
          continue
        }
        let latest = (packGoLatest $t)
        if ($latest | is-not-empty) and $latest != $t.version {
          opPrint $"($t.path) ($t.version) -> ($latest)"
        } else if (packGoOlder $t.go $toolchain) {
          # the same release is still out of date when an older toolchain built it: sync rebuilds it
          opPrint $"($t.path) ($t.version) ($t.go) -> ($toolchain)"
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
      if ($asked | is-empty) {
        packGotmUpdate
      }
      let tools = (packGoTools | where { |t| ($asked | is-empty) or ($asked | any { |n| packGoNamed $t $n }) })
      # an install always builds, and a build is only free while go's caches still hold the last one, so a tool
      # already at the latest release is left alone, as `cargo install-update` leaves a crate. one an older toolchain
      # built is not: a go binary carries the standard library it was built with, so only a rebuild gets go's fixes.
      # a release the proxy cannot name is not a match, and the install is left to say why
      let toolchain = (packGoToolchain)
      for t in $tools {
        if not (packGoOlder $t.go $toolchain) and (packGoLatest $t) == $t.version {
          continue
        }
        packOp [$cmd install $"($t.path)@latest"]
      }
    }
    tidy => {
      packGotmTidy
      # the build cache trims itself; the module cache keeps every download until it is cleaned
      packOp [$cmd clean -modcache]
    }
  }
}
