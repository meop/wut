import { type Sh, ShBase } from '../sh'

export class Pwsh extends ShBase implements Sh {
  constructor() {
    super('pwsh', 'ps1')
  }

  toVal(value: string): string {
    return `'${value.replaceAll("'", "`''")}'`
  }

  withEval(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `Invoke-Expression "${l}"`))
  }

  withTrace(): Sh {
    return this.with('Set-PSDebug -Trace 1')
  }

  withVarArrSet(name: string, values: Array<string>): Sh {
    const valuesExpanded = `@( ${values.map(v => this.toVal(v)).join(', ')} )`
    return this.with(`$${name} = ${valuesExpanded}`)
  }

  withVarSet(name: string, value: string): Sh {
    return this.with(`$${name} = ${this.toVal(value)}`)
  }

  withVarUnset(name: string): Sh {
    return this.with(`Remove-Variable ${name} -ErrorAction SilentlyContinue`)
  }
}
