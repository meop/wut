import { type Cli, CliBase } from '../cli'

export class Nushell extends CliBase implements Cli {
  constructor() {
    super('nu', 'nu')
  }

  static execStr(value: string): string {
    return `nu --no-config-file -c ${value}`
  }

  toInnerStr(value: string): string {
    return `r#'${value}'#`
  }

  toOuterStr(value: string): string {
    return `\`${value}\``
  }

  withTrace(): Cli {
    return this.with(async () => []) // no direct equivalent
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `$env.${await name()} = [ ${(await values()).join(', ')} ]`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Cli {
    return this.with(async () => [`$env.${await name()} = ${await value()}`])
  }

  withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [`hide-env ${await name()}`])
  }
}
