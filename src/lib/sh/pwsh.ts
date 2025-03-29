import { type Sh, ShBase } from '../sh'

export class Pwsh extends ShBase implements Sh {
  constructor() {
    super('pwsh', 'ps1')
  }

  withEval(...lines: Array<string>): Sh {
    return super.with(...lines.map(l => `Invoke-Expression "${l}"`))
  }

  withSetVar(name: string, value: string): Sh {
    return super.with(`$${name} = ${this.toVal(value)}`)
  }

  withSetArrayVar(name: string, value: Array<string>): Sh {
    const splatValues = `@( ${value.map(v => this.toVal(v)).join(', ')} )`
    return super.with(`$${name} = ${splatValues}`)
  }

  withUnsetVar(name: string): Sh {
    return super.with(`Remove-Variable ${name} -ErrorAction SilentlyContinue`)
  }

  withTrace(): Sh {
    return super.with('Set-PSDebug -Trace 1')
  }
}
