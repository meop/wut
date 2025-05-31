import { type Cli, CliBase } from '../cli'

export class Zshell extends CliBase implements Cli {
  constructor() {
    super('zsh', 'zsh')
  }

  toRawStr(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`
  }

  withTrace(): Cli {
    return this.with(async () => ['set -x'])
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `${await name()}=( ${(await values()).map(v => this.toRawStr(v)).join(' ')} )`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Cli {
    return this.with(async () => [
      `${await name()}=${this.toRawStr(await value())}`,
    ])
  }

  withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [`unset ${await name()}`])
  }
}
