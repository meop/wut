if (Get-Command nvim -ErrorAction Ignore) {
  $env:EDITOR = 'vim'
  $env:VISUAL = 'vim'
}
