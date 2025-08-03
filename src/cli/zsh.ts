import { type Cli, CliBase } from '../cli.ts'

export class Zshell extends CliBase implements Cli {
  constructor() {
    super('zsh', 'zsh')
  }

  static execStr(value: string) {
    return `zsh --no-rcs -c ${value}`
  }

  async gatedFunc(name: string, lines: Promise<Array<string>>) {
    return [
      'function () {',
      `  local yn=''`,
      '  if [[ $YES ]]; then',
      `    yn='y'`,
      '  else',
      `    read "yn?? ${name} [y, [n]]: "`,
      '  fi',
      `  if [[ $yn != 'n' ]]; then`,
      ...(await lines),
      '  fi',
      '}',
    ]
  }

  override toInner(value: string) {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "'\\''")}'`
  }

  override toOuter(value: string) {
    return `'${value}'`
  }

  trace() {
    return 'set -x'
  }

  async varArrSet(name: Promise<string>, values: Promise<Array<string>>) {
    return `${await name}=( ${(await values).join(' ')} )`
  }

  async varSet(name: Promise<string>, value: Promise<string>) {
    return `${await name}=${await value}`
  }

  async varUnset(name: Promise<string>) {
    return `unset ${await name}`
  }
}
