import { type Sh, type ShValOpts, ShBase } from '../sh'

export class Pwsh extends ShBase implements Sh {
  constructor() {
    super('pwsh', 'ps1')
  }

  withSetVar(name: string, value: string, opts?: ShValOpts): Sh {
    return super.withSetVar(`$${name}`, value, opts)
  }
}
