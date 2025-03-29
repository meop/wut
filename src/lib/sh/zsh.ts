import { type Sh, ShBase } from '../sh'

export class Zsh extends ShBase implements Sh {
  constructor() {
    super('zsh', 'zsh')
  }

  withEval(...lines: Array<string>): Sh {
    return super.with(...lines.map(l => `eval "${l}"`))
  }

  withSetVar(name: string, value: string): Sh {
    return super.with(`${name}=${this.toVal(value)}`)
  }

  withSetArrayVar(name: string, value: Array<string>): Sh {
    const splatValues = `( ${value.map(v => this.toVal(v)).join(' ')} )`
    return super.with(`${name}=${splatValues}`)
  }

  withUnsetVar(name: string): Sh {
    return super.with(`unset ${name}`)
  }

  withTrace(): Sh {
    return super.with('set -x')
  }
}
