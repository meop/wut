# wut

Web Update Tool

This tool is expected to be run locally and interactively

Some operations cannot work over SSH because they are installing GUI tools

Some operations create dynamic prompts for the user and cannot be scripted

## nu

```nu
$env.WUT_URL = 'http://yard.lan:9000'

def wut --wrapped [...args] {
  mut url = $"($env.WUT_URL)" | str trim --right --char '/'
  mut url = $"($url)/sh/nu"
  mut url = $"($url)/($args | str join '/')" | str trim --right --char '/'

  nu -c $"(http get --raw --redirect-mode follow $"($url)")"
}
```

## pwsh

```pwsh
$env:WUT_URL = 'http://yard.lan:9000'

function wut {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/sh/pwsh"
  $url = "${url}/$($args -Join '/')".TrimEnd('/')

  pwsh -c "$(Invoke-WebRequest -ErrorAction Stop -ProgressAction SilentlyContinue -Uri "${url}")"
}
```

## zsh

```zsh
export WUT_URL='http://yard.lan:9000'

function wut {
  local url=$(echo "${WUT_URL}" | sed 's:/*$::')
  local url=$(echo "${url}/sh/zsh")
  local url=$(echo "${url}/$(echo "$*" | sed 's/ /\//g')" | sed 's:/*$::')

  zsh -c "$(curl --fail-with-body --location --no-progress-meter --url "${url}")"
}
```
