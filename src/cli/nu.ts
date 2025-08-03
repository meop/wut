import { type Cli, CliBase } from '../cli.ts'

export class Nushell extends CliBase implements Cli {
  constructor() {
    super('nu', 'nu')
  }

  static execStr(value: string) {
    return `nu --no-config-file -c ${value}`
  }

  async gatedFunc(name: string, lines: Promise<Array<string>>) {
    return [
      'do {',
      `  mut yn = ''`,
      `  if 'YES' in $env {`,
      `    $yn = 'y'`,
      '  } else {',
      `    $yn = input r#'? ${name} [y, [n]]: '#`,
      '  }',
      `  if $yn != 'n' {`,
      ...(await lines),
      '  }',
      '}',
    ]
  }

  override toInner(value: string) {
    return `r#'${value}'#`
  }

  override toOuter(value: string) {
    return `\`${value}\``
  }

  trace() {
    return '' // no direct equivalent
  }

  async varArrSet(name: Promise<string>, values: Promise<Array<string>>) {
    return `$env.${await name} = [ ${(await values).join(', ')} ]`
  }

  async varSet(name: Promise<string>, value: Promise<string>) {
    return `$env.${await name} = ${await value}`
  }

  async varUnset(name: Promise<string>) {
    return `hide-env ${await name}`
  }
}
