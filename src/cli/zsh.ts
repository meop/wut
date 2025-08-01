import { type Cli, CliBase } from '../cli.ts'

export class Zshell extends CliBase implements Cli {
  constructor() {
    super('zsh', 'zsh')
  }

  static execStr(value: string): string {
    return `zsh --no-rcs -c ${value}`
  }

  override toInnerStr(value: string): string {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "'\\''")}'`
  }

  override toOuterStr(value: string): string {
    return `'${value}'`
  }

  override withTrace(): Cli {
    return this.with(() => Promise.resolve(['set -x']))
  }

  override withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli {
    return this.with(async () => [
      `${await name()}=( ${(await values()).join(' ')} )`,
    ])
  }

  override withVarSet(
    name: () => Promise<string>,
    value: () => Promise<string>,
  ): Cli {
    return this.with(async () => [`${await name()}=${await value()}`])
  }

  override withVarUnset(name: () => Promise<string>): Cli {
    return this.with(async () => [`unset ${await name()}`])
  }
}
