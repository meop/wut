import { type Sh, ShBase } from '../sh'

export class Pwsh extends ShBase implements Sh {
  constructor() {
    super('pwsh', 'ps1')
  }

  toVal(value: string): string {
    return `'${value.replaceAll("'", "''")}'`
  }

  withEval(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `Invoke-Expression "${l}"`),
    )
  }

  withTrace(): Sh {
    return this.with(async () => ['Set-PSDebug -Trace 1'])
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Sh {
    return this.with(async () => [
      `$${await name()} = ${`@( ${(await values()).map(v => this.toVal(v)).join(', ')} )`}`,
    ])
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
    return this.with(async () => [
      `$${await name()} = ${this.toVal(await value())}`,
    ])
  }

  withVarUnset(name: () => Promise<string>): Sh {
    return this.with(async () => [
      `Remove-Variable ${await name()} -ErrorAction SilentlyContinue`,
    ])
  }
}
