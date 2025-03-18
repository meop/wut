import { type Sh, type ShVarOpts, SysSh } from '../sh'

export class Pwsh extends SysSh {
  constructor() {
    super('pwsh', 'ps1')
  }

  withSetVar(name: string, value: string, opts?: ShVarOpts): Sh {
    return super.withSetVar(`$${name}`, value, opts)
  }
}
