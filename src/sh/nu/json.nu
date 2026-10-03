# merge into json text, keeping comments, order and layout. allows comments and trailing commas

# past whitespace and comments
def jsoncSkip [cs: list<string>, start: int] {
  let n = ($cs | length)
  mut i = $start
  loop {
    if $i >= $n {
      break
    }
    let c = ($cs | get $i)
    if $c in [' ' "\t" "\n" "\r"] {
      $i += 1
      continue
    }
    if $c == '/' and ($i + 1) < $n and ($cs | get ($i + 1)) == '/' {
      while $i < $n and ($cs | get $i) != "\n" {
        $i += 1
      }
      continue
    }
    if $c == '/' and ($i + 1) < $n and ($cs | get ($i + 1)) == '*' {
      $i += 2
      while ($i + 1) < $n and not (($cs | get $i) == '*' and ($cs | get ($i + 1)) == '/') {
        $i += 1
      }
      $i += 2
      continue
    }
    break
  }
  $i
}

# end of the string at start
def jsoncStringEnd [cs: list<string>, start: int] {
  let n = ($cs | length)
  mut i = $start + 1
  while $i < $n {
    let c = ($cs | get $i)
    if $c == '\' {
      $i += 2
    } else if $c == '"' {
      return ($i + 1)
    } else {
      $i += 1
    }
  }
  $n
}

# end of the value at start
def jsoncValueEnd [cs: list<string>, start: int] {
  let n = ($cs | length)
  let c = ($cs | get $start)
  if $c == '"' {
    return (jsoncStringEnd $cs $start)
  }
  if $c in ['{' '['] {
    mut depth = 0
    mut i = $start
    while $i < $n {
      let d = ($cs | get $i)
      if $d == '"' {
        $i = (jsoncStringEnd $cs $i)
      } else if $d == '/' {
        $i = (jsoncSkip $cs $i)
      } else if $d in ['{' '['] {
        $depth += 1
        $i += 1
      } else if $d in ['}' ']'] {
        $depth -= 1
        $i += 1
        if $depth == 0 {
          return $i
        }
      } else {
        $i += 1
      }
    }
    return $n
  }
  mut i = $start
  while $i < $n and ($cs | get $i) not-in [',' '}' ']' ' ' "\t" "\n" "\r" '/'] {
    $i += 1
  }
  $i
}

# members of the object at start, with key and value positions
def jsoncMembers [cs: list<string>, start: int] {
  let n = ($cs | length)
  mut i = (jsoncSkip $cs ($start + 1))
  mut members = []
  while $i < $n and ($cs | get $i) == '"' {
    let ks = $i
    let ke = (jsoncStringEnd $cs $ks)
    let key = ($cs | skip $ks | take ($ke - $ks) | str join | from json)
    $i = (jsoncSkip $cs $ke)
    $i = (jsoncSkip $cs ($i + 1))
    let vs = $i
    let ve = (jsoncValueEnd $cs $vs)
    $members = ($members | append {key: $key, ks: $ks, vs: $vs, ve: $ve})
    $i = (jsoncSkip $cs $ve)
    if $i < $n and ($cs | get $i) == ',' {
      $i = (jsoncSkip $cs ($i + 1))
    }
  }
  {members: $members, close: $i}
}

# indent of the line holding pos
def jsoncLineIndent [cs: list<string>, pos: int] {
  mut j = $pos
  while $j > 0 and ($cs | get ($j - 1)) != "\n" {
    $j -= 1
  }
  mut k = $j
  while $k < ($cs | length) and ($cs | get $k) in [' ' "\t"] {
    $k += 1
  }
  $cs | skip $j | take ($k - $j) | str join
}

# whether pos is the first thing on its line
def jsoncLineFirst [cs: list<string>, pos: int] {
  mut j = $pos
  while $j > 0 and ($cs | get ($j - 1)) in [' ' "\t"] {
    $j -= 1
  }
  $j == 0 or ($cs | get ($j - 1)) == "\n"
}

# value as json, nested lines indented
def jsoncRender [value: any, indent: string] {
  $value | to json --indent 2 | lines | enumerate | each { |l|
    if $l.index == 0 { $l.item } else { $indent + $l.item }
  } | str join "\n"
}

def jsoncSplice [cs: list<string>, from: int, to: int, text: string] {
  ($cs | take $from | str join) + $text + ($cs | skip $to | str join)
}

# set the value at path
def jsoncSet [text: string, path: list<string>, value: any] {
  let nested = { |rest: list<string>| $rest | reverse | reduce --fold $value { |k, acc| {$k: $acc} } }
  if ($text | str trim | is-empty) {
    return (((do $nested $path) | to json --indent 2) + "\n")
  }
  let cs = ($text | split chars)
  let n = ($cs | length)
  mut obj = (jsoncSkip $cs 0)
  for d in 0..<($path | length) {
    let key = ($path | get $d)
    let m = (jsoncMembers $cs $obj)
    let found = ($m.members | where key == $key | get -o 0)
    if $found != null {
      let last = ($d == ($path | length) - 1)
      if not $last and ($cs | get $found.vs) == '{' {
        $obj = $found.vs
        continue
      }
      let v = if $last { $value } else { do $nested ($path | skip ($d + 1)) }
      return (jsoncSplice $cs $found.vs $found.ve (jsoncRender $v (jsoncLineIndent $cs $found.ks)))
    }

    let v = (do $nested ($path | skip ($d + 1)))
    if ($m.members | is-empty) {
      # empty object
      let base = (jsoncLineIndent $cs $obj)
      let indent = $base + '  '
      let entry = $"($key | to json): (jsoncRender $v $indent)"
      let tail = if (jsoncLineFirst $cs $m.close) { '' } else { "\n" + $base }
      return (jsoncSplice $cs ($obj + 1) ($obj + 1) $"\n($indent)($entry)($tail)")
    }
    let prev = ($m.members | last)
    if not (jsoncLineFirst $cs $prev.ks) {
      # one-line object
      let entry = $"($key | to json): ($v | to json --raw)"
      return (jsoncSplice $cs $prev.ve $prev.ve $", ($entry)")
    }
    let indent = (jsoncLineIndent $cs $prev.ks)
    let entry = $"($key | to json): (jsoncRender $v $indent)"
    # after the last member, past its trailing comma or comment
    mut q = $prev.ve
    while $q < $n and ($cs | get $q) in [' ' "\t"] {
      $q += 1
    }
    let comma = ($q < $n and ($cs | get $q) == ',')
    if $comma {
      $q += 1
    }
    mut eol = $q
    while $eol < $n and ($cs | get $eol) in [' ' "\t"] {
      $eol += 1
    }
    let comment = ($eol + 1 < $n and ($cs | get $eol) == '/' and ($cs | get ($eol + 1)) in ['/' '*'])
    if $comment {
      $eol = (jsoncSkip $cs $eol)
      while $eol > $q and ($cs | get ($eol - 1)) in [' ' "\t" "\n" "\r"] {
        $eol -= 1
      }
    }
    if $comma {
      return (jsoncSplice $cs $eol $eol $"\n($indent)($entry),")
    }
    if $comment {
      let withComma = (jsoncSplice $cs $prev.ve $prev.ve ',' | split chars)
      return (jsoncSplice $withComma ($eol + 1) ($eol + 1) $"\n($indent)($entry)")
    }
    return (jsoncSplice $cs $prev.ve $prev.ve $",\n($indent)($entry)")
  }
  $text
}

# set each leaf of wanted that differs
def jsoncMerge [text: string, wanted: record] {
  let leaves = { |self, rec: record, prefix: list<string>|
    $rec | columns | each { |k|
      let v = ($rec | get $k)
      let p = ($prefix | append $k)
      if ($v | describe | str starts-with 'record') and ($v | is-not-empty) {
        do $self $self $v $p
      } else {
        [{path: $p, value: $v}]
      }
    } | reduce --fold [] { |l, acc| $acc ++ $l }
  }
  do $leaves $leaves $wanted [] | reduce --fold $text { |leaf, acc|
    let current = if ($acc | str trim | is-empty) { null } else {
      $acc | from json | get -o ($leaf.path | into cell-path)
    }
    if $current == $leaf.value { $acc } else { jsoncSet $acc $leaf.path $leaf.value }
  }
}
