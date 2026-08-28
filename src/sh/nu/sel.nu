# ghpm's selection syntax: comma or space separated, ranges as a-b, empty takes everything, 0 quits.
# null means quit, which invalid input is treated as too, rather than re-asking
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
      [(try { $halves | get 0 | into int } catch { null }), (try { $halves | get 1 | into int } catch { null })]
    } else {
      let n = (try { $part | into int } catch { null })
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
