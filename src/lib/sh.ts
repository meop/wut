import { getFilePath, getFilePaths } from './path'

export interface Sh {
  build(): Promise<string>

  with(...lines: Array<string>): Sh
  withEval(...lines: Array<string>): Sh

  withPrint(...lines: Array<string>): Sh
  withPrintErr(...lines: Array<string>): Sh
  withPrintInfo(...lines: Array<string>): Sh
  withPrintOp(...lines: Array<string>): Sh
  withPrintSucc(...lines: Array<string>): Sh
  withPrintWarn(...lines: Array<string>): Sh

  withLoadDirPath(...parts: Array<string>): Sh
  withLoadFilePath(...parts: Array<string>): Sh

  withSetVar(name: string, value: string): Sh
  withSetArrayVar(name: string, value: Array<string>): Sh
  withUnsetVar(name: string): Sh

  withTrace(): Sh
}

export class ShBase {
  lineBuilders: (() => Promise<string>)[] = []
  shName: string
  shExt: string

  localParts(parts: Array<string>) {
    return [import.meta.dir, 'sh', this.shName, ...parts]
  }

  constructor(shName: string, shExt: string) {
    this.shName = shName
    this.shExt = shExt
  }

  async build() {
    const lines: Array<string> = []
    for (const lineBuilder of this.lineBuilders) {
      lines.push(await lineBuilder())
      lines.push('')
    }
    return lines.join('\n')
  }

  toVal(value: string): string {
    return `'${value}'`
  }

  with(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => line)
    }
    return this
  }

  withEval(...lines: Array<string>): Sh {
    throw new Error('not implemented')
  }

  withPrint(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `print ${this.toVal(line)}`)
    }
    return this
  }

  withPrintErr(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `printErr ${this.toVal(line)}`)
    }
    return this
  }

  withPrintInfo(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `printInfo ${this.toVal(line)}`)
    }
    return this
  }

  withPrintOp(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `printOp ${this.toVal(line)}`)
    }
    return this
  }

  withPrintSucc(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `printSucc ${this.toVal(line)}`)
    }
    return this
  }

  withPrintWarn(...lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `printWarn ${this.toVal(line)}`)
    }
    return this
  }

  withLoadDirPath(...parts: Array<string>): Sh {
    this.lineBuilders.push(async () => {
      const lines: Array<string> = []
      for (const filePath of await getFilePaths(this.localParts(parts))) {
        lines.push(await Bun.file(filePath).text())
      }

      return lines.join('\n')
    })
    this.lineBuilders.push(async () => '')
    return this
  }

  withLoadFilePath(...parts: Array<string>): Sh {
    this.lineBuilders.push(async () => {
      return await Bun.file(
        `${getFilePath(this.localParts(parts))}.${this.shExt}`,
      ).text()
    })
    return this
  }

  withSetVar(name: string, value: string): Sh {
    throw new Error('not implemented')
  }

  withSetArrayVar(name: string, value: Array<string>): Sh {
    throw new Error('not implemented')
  }

  withUnsetVar(name: string): Sh {
    throw new Error('not implemented')
  }

  withTrace(): Sh {
    throw new Error('not implemented')
  }
}
