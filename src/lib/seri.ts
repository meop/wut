import YAML from 'yaml'

export enum Fmt {
  json = 'json',
  yaml = 'yaml',
}

function jsonObj(input: string) {
  return JSON.parse(input)
}

function jsonStr<T>(input: T) {
  return JSON.stringify(input, null, 2)
}

function yamlObj(input: string) {
  return YAML.parse(input)
}

function yamlStr<T>(input: T) {
  return YAML.stringify(input)
}

export function consStr<T>(input: T, format: Fmt = Fmt.yaml) {
  if (format === Fmt.yaml) {
    return yamlStr(input)
  }
  return jsonStr(input)
}

export function cfgObj(input: string, format: Fmt = Fmt.yaml) {
  if (format === Fmt.json) {
    return jsonObj(input)
  }
  return yamlObj(input)
}
