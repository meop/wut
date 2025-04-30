import { type Sh, ShBase } from '../sh'

export class Nushell extends ShBase implements Sh {
  constructor() {
    super('nu', 'nu')
  }

  toVal(value: string): string {
    return `'${value}'`
  }

  withTrace(): Sh {
    return this.with(async () => []) // no direct equivalent
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Sh {
    return this.with(async () => [
      `$env.${await name()} = [ ${(await values()).map(v => this.toVal(v)).join(', ')} ]`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
    return this.with(async () => [
      `$env.${await name()} = ${this.toVal(await value())}`,
    ])
  }

  withVarUnset(name: () => Promise<string>): Sh {
    return this.with(async () => [`hide-env ${await name()}`])
  }
}
