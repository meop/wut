# ghpm's table: a rule as wide as each header, columns padded to their widest cell, the last one loose. a column no
# row fills says nothing, so it is left out: a plan of only loose names has no group to show
def wutTable [headers: list<string>, rows: list<list<string>>] {
  let keep = ($headers | enumerate | where { |h|
    ($rows | is-empty) or ($rows | any { |r| $r | get -o $h.index | default '' | is-not-empty })
  } | get index)
  let headers = ($keep | each { |i| $headers | get $i })
  let rows = ($rows | each { |r| $keep | each { |i| $r | get -o $i | default '' } })
  let widths = ($headers | enumerate | each { |h|
    [($h.item | str length)] ++ ($rows | each { |r| $r | get -o $h.index | default '' | str length }) | math max
  })
  let line = { |cells: list<string>|
    $cells | enumerate | each { |c|
      if $c.index == (($cells | length) - 1) { $c.item } else { $c.item | fill --alignment left --width ($widths | get $c.index) }
    } | str join ' ' | str trim --right
  }
  opPrint (do $line $headers)
  opPrint (do $line ($headers | each { |h| '-' | fill --alignment left --width ($h | str length) --character '-' }))
  for r in $rows { opPrint (do $line $r) }
}

def wutSelectParse [choice: string, max: int] {
  let trimmed = ($choice | str trim)
  if ($trimmed | is-empty) {
    return (1..$max | each { |i| $i })
  }
  mut picked = []
  for part in ($trimmed | split row --regex '[, ]+' | where { |p| $p | is-not-empty }) {
    let bounds = if ($part | str contains '-') {
      let halves = ($part | split row '-')
      if ($halves | length) != 2 {
        return null
      }
      [(try { $halves | get 0 | into int } catch { |e| opRethrowInterrupt $e; null }), (try { $halves | get 1 | into int } catch { |e| opRethrowInterrupt $e; null })]
    } else {
      let n = (try { $part | into int } catch { |e| opRethrowInterrupt $e; null })
      if $n == 0 {
        return null
      }
      [$n, $n]
    }
    let from = ($bounds | get 0)
    let to = ($bounds | get 1)
    if $from == null or $to == null or $from < 1 or $to > $max or $from > $to {
      return null
    }
    for i in $from..$to {
      if $i not-in $picked {
        $picked = ($picked | append $i)
      }
    }
  }
  $picked | sort
}

def wutSelectRead [max: int] {
  if YES in $env {
    return (1..$max | each { |i| $i })
  }
  opPrint ''
  wutSelectParse (input $"enter number\(s\) [empty=all] \(0=quit | 1[,][-]($max)\): ") $max
}
