import YAML from 'yaml'

export enum Fmt {
  yaml = 'yaml',
  json = 'json',
}

export function toFmt(input: string) {
  if (input === 'json') {
    return Fmt.json
  }
  return Fmt.yaml
}

function fromYaml(input: string) {
  return YAML.parse(input)
}
function toYaml<T>(input: T) {
  return YAML.stringify(input)
}

function fromJson(input: string) {
  return JSON.parse(input)
}
function toJson<T>(input: T) {
  return JSON.stringify(input, null, 2)
}

export function toCon<T>(input: T, format: Fmt) {
  let output: string
  if (!input) {
    output = ''
  } else if (format === Fmt.yaml) {
    output = toYaml(input)
  } else {
    output = toJson(input)
  }
  return output.trimEnd()
}

export function fromCfg(input: string, format: Fmt) {
  if (!input) {
    return null
  }
  if (format === Fmt.yaml) {
    return fromYaml(input)
  }
  if (format === Fmt.json) {
    return fromJson(input)
  }
  return input
}
