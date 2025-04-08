import YAML from 'yaml'

export enum Fmt {
  yaml = 'yaml',
  json = 'json',
  text = 'text',
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

export function toCon<T>(input: T, format: Fmt = Fmt.yaml) {
  let output: string
  if (format === Fmt.yaml) {
    output = toYaml(input)
  } else if (format === Fmt.json) {
    output = toJson(input)
  } else {
    output = String(input)
  }
  return output.trimEnd()
}

export function fromCfg(input: string, format: Fmt = Fmt.yaml) {
  let output: string
  if (format === Fmt.yaml) {
    output = fromYaml(input)
  } else if (format === Fmt.json) {
    output = fromJson(input)
  } else {
    output = input
  }
  return output
}
