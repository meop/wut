import { type Cli, CliBase } from '../cli'

export class Nushell extends CliBase implements Cli {
  constructor() {
    super('nu', 'nu')
  }

  toRawStr(value: string): string {
    return `r#'${value}'#`
  }

  withTrace(): Cli {
    return this.with(async () => []) // no direct equivalent
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `$env.${await name()} = [ ${(await values()).map(v => this.toRawStr(v)).join(', ')} ]`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Cli {
    return this.with(async () => [
      `$env.${await name()} = ${this.toRawStr(await value())}`,
    ])
  }

  withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [`hide-env ${await name()}`])
  }
}
