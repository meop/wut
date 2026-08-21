def scriptHasCmd [...cmds: string] {
  $cmds | any { |cmd| which $cmd | is-not-empty }
}

# entries are 'tool' (always listed) or 'tool=cmd[,cmd]' (listed only when the client has one of the cmds)
def scriptFindGroup [label: string, ...entries: string] {
  let tools = (
    $entries
      | each { |entry| $entry | split row '=' }
      | where { |parts|
        let cmds = ($parts | get -o 1 | default '')
        ($cmds | is-empty) or (scriptHasCmd ...($cmds | split row ','))
      }
      | each { |parts| $parts | get 0 }
  )
  if ($tools | is-empty) {
    return
  }
  opPrint $label
  opPrint $"  ($tools | str join ', ')"
}
