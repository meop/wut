let bin = ([$nu.home-dir .standalone bin standalone] | path join)
opPrintMaybeRunCmd $bin self update
