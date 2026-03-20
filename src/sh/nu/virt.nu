def deepMerge [base, override] {
  mut result = $base
  for kv in ($override | transpose key value) {
    if ($kv.key in $result) {
      let baseVal = $result | get $kv.key
      let baseDesc = ($baseVal | describe)
      let overrideDesc = ($kv.value | describe)
      if ($baseDesc | str starts-with 'record') and ($overrideDesc | str starts-with 'record') {
        $result = $result | upsert $kv.key (deepMerge $baseVal $kv.value)
      } else if ($baseDesc | str starts-with 'list') and ($overrideDesc | str starts-with 'list') {
        $result = $result | upsert $kv.key ($baseVal | append $kv.value)
      } else {
        $result = $result | upsert $kv.key $kv.value
      }
    } else {
      $result = $result | upsert $kv.key $kv.value
    }
  }
  $result
}
