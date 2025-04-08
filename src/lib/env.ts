export type Env = { [key: string]: string }

export function toEnvKey(...parts: Array<string>) {
  return parts.join('_').toUpperCase()
}
