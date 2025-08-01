import { type Cli, CliBase } from '../cli.ts'

export class Nushell extends CliBase implements Cli {
  constructor() {
    super('nu', 'nu')
  }

  static execStr(value: string): string {
    return `nu --no-config-file -c ${value}`
  }

  override toInnerStr(value: string): string {
    return `r#'${value}'#`
  }

  override toOuterStr(value: string): string {
    return `\`${value}\``
  }

  override withTrace(): Cli {
    return this.with(() => Promise.resolve([])) // no direct equivalent
  }

  override withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `$env.${await name()} = [ ${(await values()).join(', ')} ]`,
    ])
  }

  override withVarSet(
    name: () => Promise<string>,
    value: () => Promise<string>,
  ): Cli {
    return this.with(async () => [`$env.${await name()} = ${await value()}`])
  }

  override withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [`hide-env ${await name()}`])
  }
}
