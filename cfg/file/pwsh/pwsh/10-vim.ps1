if (Get-Command nvim -ErrorAction Ignore) {
  $env:EDITOR = 'nvim'
  $env:VISUAL = 'nvim'
}
