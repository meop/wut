# wut

Web Update Tool

This tool is expected to be run locally and interactively

Some operations cannot work over SSH because they are installing GUI tools

Some operations create dynamic prompts for the user and cannot be scripted

## zsh

```zsh
export WUT_URL='http://yard.lan:9000'

alias wut='wut_wrap'

function wut_wrap {
  local url="$(echo "${WUT_URL}" | sed 's:/*$::')"
  local url="${url}/sh/zsh"
  local url="$(echo "${url}" "$@" | sed 's/ /\//g' | sed 's:/*$::')"

  zsh -c "$(curl --fail-with-body --location --silent --url ${url})"
}
```

## nu

```nu
$env.WUT_URL = 'http://yard.lan:9000'

alias wut = wut_wrap

def wut_wrap [...args] {
  mut url = $"($env.WUT_URL | str trim --right --char '/')"
  mut url = $"($url)/sh/nu"
  mut url = $"( $"($url)/($args | str join '/')" | str trim --right --char '/' )"

  nu -c $"(curl --fail-with-body --location --silent --url $url)"
}

```

## pwsh

```pwsh
$env:WUT_URL = 'http://yard.lan:9000'

Set-Alias wut 'wut_wrap'

function wut_wrap {
  $url = "${env:WUT_URL}".TrimEnd('/')
  $url = "${url}/sh/pwsh"
  $url = "${url}/$($args -Join '/')".TrimEnd('/')

  pwsh -c "$(Invoke-WebRequest -ErrorAction Stop -ProgressAction SilentlyContinue -Uri ${url})"
}
```
