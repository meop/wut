import { type Sh, ShBase } from '../sh'

export class Zshell extends ShBase implements Sh {
  constructor() {
    super('zsh', 'zsh')
  }

  toRawStr(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`
  }

  withTrace(): Sh {
    return this.with(async () => ['set -x'])
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Sh {
    return this.with(async () => [
      `${await name()}=( ${(await values()).map(v => this.toRawStr(v)).join(' ')} )`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
    return this.with(async () => [
      `${await name()}=${this.toRawStr(await value())}`,
    ])
  }

  withVarUnset(name: () => Promise<string>): Sh {
    return this.with(async () => [`unset ${await name()}`])
  }
}
