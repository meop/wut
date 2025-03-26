import { type Sh, ShBase } from '../sh'

export class Zsh extends ShBase implements Sh {
  constructor() {
    super('zsh', 'zsh')
  }

  withEval(...lines: Array<string>): Sh {
    return super.with(...lines.map(l => `eval "${l}"`))
  }

  withUnsetVar(name: string): Sh {
    return super.with(`unset ${name}`)
  }

  withTrace(): Sh {
    return super.with('set -x')
  }
}
