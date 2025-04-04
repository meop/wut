import { type Sh, ShBase } from '../sh'

export class Zsh extends ShBase implements Sh {
  constructor() {
    super('zsh', 'zsh')
  }

  toVal(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`
  }

  withEval(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () => (await lines()).map(l => `eval "${l}"`))
  }

  withTrace(): Sh {
    return this.with(async () => ['set -x'])
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Sh {
    return this.with(async () => [
      `${await name()}=${(await values()).map(v => this.toVal(v)).join(' ')}`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
    return this.with(async () => [
      `${await name()}=${this.toVal(await value())}`,
    ])
  }

  withVarUnset(name: () => Promise<string>): Sh {
    return this.with(async () => [`unset ${await name()}`])
  }
}
