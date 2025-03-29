import { buildFilePath, getFilePaths, getFileText } from './path'

export interface Sh {
  build(): Promise<string>

  with(...lines: Array<string>): Sh
  withEval(...lines: Array<string>): Sh

  withFsDirList(...parts: Array<string>): Sh
  withFsDirLoad(...parts: Array<string>): Sh
  withFsFileLoad(...parts: Array<string>): Sh

  withPrint(...lines: Array<string>): Sh
  withPrintErr(...lines: Array<string>): Sh
  withPrintInfo(...lines: Array<string>): Sh
  withPrintOp(...lines: Array<string>): Sh
  withPrintSucc(...lines: Array<string>): Sh
  withPrintWarn(...lines: Array<string>): Sh

  withVarArrSet(name: string, values: Array<string>): Sh
  withVarSet(name: string, value: string): Sh
  withVarUnset(name: string): Sh

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

  withFsDirList(...parts: Array<string>): Sh {
    this.lineBuilders.push(async () => {
      const filter = parts.pop()
      const dirPath = buildFilePath(this.localParts(parts))
      const filePaths = await getFilePaths(
        dirPath,
        this.shExt,
        filter ? [filter] : undefined,
      )

      return filePaths.map(f => this.toVal(f.replace(f, ''))).join('\n')
    })
    return this
  }

  withFsDirLoad(...parts: Array<string>): Sh {
    this.lineBuilders.push(async () => {
      const filter = parts.pop()
      const dirPath = buildFilePath(this.localParts(parts))
      const filePaths = await getFilePaths(
        dirPath,
        this.shExt,
        filter ? [filter] : undefined,
      )

      return (await Promise.all(filePaths.map(f => getFileText(f)))).join('\n')
    })
    return this
  }

  withFsFileLoad(...parts: Array<string>): Sh {
    this.lineBuilders.push(async () => {
      const filePath = `${buildFilePath(this.localParts(parts))}.${this.shExt}`

      return await getFileText(filePath)
    })
    return this
  }

  withPrint(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `print ${this.toVal(l)}`))
  }

  withPrintErr(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `printErr ${this.toVal(l)}`))
  }

  withPrintInfo(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `printInfo ${this.toVal(l)}`))
  }

  withPrintOp(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `printOp ${this.toVal(l)}`))
  }

  withPrintSucc(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `printSucc ${this.toVal(l)}`))
  }

  withPrintWarn(...lines: Array<string>): Sh {
    return this.with(...lines.map(l => `printWarn ${this.toVal(l)}`))
  }

  withTrace(): Sh {
    throw new Error('not implemented')
  }

  withVarArrSet(name: string, value: Array<string>): Sh {
    throw new Error('not implemented')
  }

  withVarSet(name: string, value: string): Sh {
    throw new Error('not implemented')
  }

  withVarUnset(name: string): Sh {
    throw new Error('not implemented')
  }
}
