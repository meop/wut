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

function fromJson(input: string) {
  return JSON.parse(input)
}

function toJson<T>(input: T) {
  return JSON.stringify(input, null, 2).trim()
}

function fromYaml(input: string) {
  return YAML.parse(input)
}

function toYaml<T>(input: T) {
  return YAML.stringify(input).trim()
}

export function toConsole<T>(input: T, format: Fmt = Fmt.yaml) {
  if (format === Fmt.json) {
    return toJson(input)
  }
  return toYaml(input)
}

export function fromConfig(input: string, format: Fmt = Fmt.yaml) {
  if (format === Fmt.json) {
    return fromJson(input)
  }
  return fromYaml(input)
}
