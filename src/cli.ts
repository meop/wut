import { buildFilePath, getFileContent } from './path.ts'

export interface Cli {
  name: string
  extension: string

  build(): Promise<string>

  fsFileLoad(parts: Promise<Array<string>>): Promise<Array<string>>
  gatedFunc(name: string, lines: Promise<Array<string>>): Promise<Array<string>>

  print(lines: Promise<string | Array<string>>): Promise<Array<string>>
  printCmd(lines: Promise<string | Array<string>>): Promise<Array<string>>
  printErr(lines: Promise<string | Array<string>>): Promise<Array<string>>
  printInfo(lines: Promise<string | Array<string>>): Promise<Array<string>>
  printSucc(lines: Promise<string | Array<string>>): Promise<Array<string>>
  printWarn(lines: Promise<string | Array<string>>): Promise<Array<string>>

  toInner: (value: string) => string
  toOuter: (value: string) => string

  trace(): string

  varArrSet(
    name: Promise<string>,
    values: Promise<Array<string>>,
  ): Promise<string>
  varSet(name: Promise<string>, value: Promise<string>): Promise<string>
  varUnset(name: Promise<string>): Promise<string>

  with(lines: Promise<string | Array<string>>): Cli
}

export class CliBase {
  name: string
  extension: string

  dirPath: string
  lineBuilders: Array<Promise<string | Array<string>>> = []

  constructor(name: string, extension: string) {
    this.name = name
    this.extension = extension

    this.dirPath = buildFilePath(import.meta.dirname ?? '', 'cli', this.name)
  }

  async build() {
    const lines: Array<string> = []
    for (const lineBuilder of this.lineBuilders) {
      const line = await lineBuilder
      lines.push(...(typeof line === 'string' ? [line] : line))
      lines.push('')
    }
    return lines.join('\n')
  }

  localDirPath(parts: Array<string>) {
    return buildFilePath(...[this.dirPath, ...parts])
  }

  async fsFileLoad(parts: Promise<Array<string>>) {
    const path = `${this.localDirPath(await parts)}.${this.extension}`
    return [(await getFileContent(path)) ?? '']
  }

  _abstract(): string {
    throw new Error('Method not implemented')
  }

  toInner(_value: string) {
    return this._abstract()
  }

  toOuter(_value: string) {
    return this._abstract()
  }

  async _print(lines: Promise<string | Array<string>>, op: string) {
    const _lines = await lines
    return (typeof _lines === 'string' ? [_lines] : _lines).map(
      (l) => `${op} ${this.toInner(l)}`,
    )
  }

  print(lines: Promise<string | Array<string>>) {
    return this._print(lines, 'opPrint')
  }

  printCmd(lines: Promise<string | Array<string>>) {
    return this._print(lines, 'opPrintCmd')
  }

  printErr(lines: Promise<string | Array<string>>) {
    return this._print(lines, 'opPrintErr')
  }

  printInfo(lines: Promise<string | Array<string>>) {
    return this._print(lines, 'opPrintInfo')
  }

  printSucc(lines: Promise<string | Array<string>>) {
    return this._print(lines, 'opPrintSucc')
  }

  printWarn(lines: Promise<string | Array<string>>) {
    return this._print(lines, 'opPrintWarn')
  }

  with(lines: Promise<string | Array<string>>) {
    this.lineBuilders.push(lines)
    return this
  }
}
