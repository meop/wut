import { type Cli, CliBase } from '../cli'

export class Zshell extends CliBase implements Cli {
  constructor() {
    super('zsh', 'zsh')
  }

  static execStr(value: string): string {
    return `zsh --no-rcs -c ${value}`
  }

  toInnerStr(value: string): string {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "'\\''")}'`
  }

  toOuterStr(value: string): string {
    return `'${value}'`
  }

  withTrace(): Cli {
    return this.with(async () => ['set -x'])
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `${await name()}=( ${(await values()).join(' ')} )`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Cli {
    return this.with(async () => [`${await name()}=${await value()}`])
  }

  withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [`unset ${await name()}`])
  }
}
