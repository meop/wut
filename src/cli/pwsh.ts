import { type Cli, CliBase } from '../cli.ts'

export class Powershell extends CliBase implements Cli {
  constructor() {
    super('pwsh', 'ps1')
  }

  static execStr(value: string): string {
    return `pwsh -noprofile -c ${value}`
  }

  override toInnerStr(value: string): string {
    return `'${value.replaceAll("'", "''")}'`
  }

  override toOuterStr(value: string): string {
    return `'${value}'`
  }

  override withTrace(): Cli {
    return this.with(() => Promise.resolve(['Set-PSDebug -Trace 1']))
  }

  override withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `$${await name()} = ${`@( ${(await values()).join(', ')} )`}`,
    ])
  }

  override withVarSet(
    name: () => Promise<string>,
    value: () => Promise<string>,
  ): Cli {
    return this.with(async () => [`$${await name()} = ${await value()}`])
  }

  override withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [
      `Remove-Variable ${await name()} -ErrorAction SilentlyContinue`,
    ])
  }
}
