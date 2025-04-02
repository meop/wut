import { type Sh, ShBase } from '../sh'

export class Zsh extends ShBase implements Sh {
  constructor() {
    super('zsh', 'zsh')
  }

  toVal(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`
  }

  withEval(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `eval "${l}"`))
  }

  withTrace(): Sh {
    return this.with('set -x')
  }

  withVarArrSet(name: string, values: Array<string>): Sh {
    const valuesExpanded = `( ${values.map(v => this.toVal(v)).join(' ')} )`
    return this.with(`${name}=${valuesExpanded}`)
  }

  withVarSet(name: string, value: string): Sh {
    return this.with(`${name}=${this.toVal(value)}`)
  }

  withVarUnset(name: string): Sh {
    return this.with(`unset ${name}`)
  }
}
