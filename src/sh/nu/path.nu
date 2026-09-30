# a tool this run installed, or one installed since the calling shell started, lands somewhere that shell's PATH may
# not reach yet. the env stage wut deploys already knows every such place, and adds each once it exists, so the run
# asks the native shell for the PATH a new one would start with, rather than leaving the next step to find nothing.
# windows keeps PATH in the registry too, where installers record theirs, so that joins what the profile builds
def --env wutPathRefresh [] {
  let out = if $env.SYS_OS_PLAT? == 'windows' {
    if (which pwsh | is-empty) {
      return
    }
    let cmd = "$sep = [IO.Path]::PathSeparator; $reg = @('Machine', 'User') | ForEach-Object { [Environment]::GetEnvironmentVariable('Path', $_) }; ((($env:PATH -split $sep) + ($reg -split $sep)) | Where-Object { $_ } | Select-Object -Unique) -join $sep"
    ^pwsh -NoLogo -Command $cmd | complete
  } else {
    if (which zsh | is-empty) {
      return
    }
    ^zsh -c 'print -r -- $PATH' | complete
  }
  # the last line, since an env stage is free to print on its way through
  let path = ($out.stdout | lines | where { is-not-empty } | last 1 | get -o 0)
  if $out.exit_code != 0 or $path == null {
    return
  }
  $env.PATH = ($path | split row (char esep) | where { is-not-empty } | uniq)
}
