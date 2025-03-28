import YAML from 'yaml'

export enum Fmt {
  json = 'json',
  yaml = 'yaml',
}

function fromJson(input: string) {
  return JSON.parse(input)
}

function toJson<T>(input: T) {
  return JSON.stringify(input, null, 2)
}

function fromYaml(input: string) {
  return YAML.parse(input)
}

function toYaml<T>(input: T) {
  return YAML.stringify(input)
}

export function toConsole<T>(input: T, format: Fmt = Fmt.yaml) {
  if (format === Fmt.yaml) {
    return toYaml(input)
  }
  return toJson(input)
}

export function fromConfig(input: string, format: Fmt = Fmt.yaml) {
  if (format === Fmt.json) {
    return fromJson(input)
  }
  return fromYaml(input)
}
