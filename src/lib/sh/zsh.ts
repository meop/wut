import { type Sh, ShBase } from '../sh'

export class Zsh extends ShBase implements Sh {
  constructor() {
    super('zsh', 'zsh')
  }
}
