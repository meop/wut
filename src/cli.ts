import { buildFilePath, getFilePaths, getFileContent, toRelParts } from './path'

export interface Cli {
  build(): Promise<string>
  name: string
  extension: string

  toInnerStr: (value: string) => string
  toOuterStr: (value: string) => string

  with(lines: () => Promise<Array<string>>): Cli

  withFsDirLoad(
    parts: () => Promise<Array<string>>,
    options?: {
      filters?: () => Promise<Array<string>>
    },
  ): Cli
  withFsDirPrint(
    parts: () => Promise<Array<string>>,
    options?: {
      filters?: () => Promise<Array<string>>
    },
  ): Cli
  withFsFileLoad(parts: () => Promise<Array<string>>): Cli
  withFsFilePrint(parts: () => Promise<Array<string>>): Cli

  withPrint(lines: () => Promise<Array<string>>): Cli
  withPrintErr(lines: () => Promise<Array<string>>): Cli
  withPrintInfo(lines: () => Promise<Array<string>>): Cli
  withPrintOp(lines: () => Promise<Array<string>>): Cli
  withPrintSucc(lines: () => Promise<Array<string>>): Cli
  withPrintWarn(lines: () => Promise<Array<string>>): Cli

  withTrace(): Cli

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Cli
  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Cli
  withVarUnset(name: () => Promise<string>): Cli
}

export class CliBase {
  name: string
  extension: string

  dirPath: string
  lineBuilders: Array<() => Promise<string>> = []

  constructor(name: string, extension: string) {
    this.name = name
    this.extension = extension

    this.dirPath = buildFilePath(import.meta.dir, 'cli', this.name)
  }

  async build() {
    const lines: Array<string> = []
    for (const lineBuilder of this.lineBuilders) {
      lines.push(await lineBuilder())
      lines.push('')
    }
    return lines.join('\n')
  }

  toInnerStr(_value: string): string {
    throw new Error('not implemented')
  }

  toOuterStr(_value: string): string {
    throw new Error('not implemented')
  }

  with(lines: () => Promise<Array<string>>): Cli {
    this.lineBuilders.push(async () => (await lines()).join('\n'))
    return this
  }

  localDirPath(parts: Array<string>) {
    return buildFilePath(...[this.dirPath, ...parts])
  }

  withFsDirLoad(
    parts: () => Promise<Array<string>>,
    options?: {
      filters?: () => Promise<Array<string>>
    },
  ): Cli {
    return this.with(async () => {
      const dirPath = this.localDirPath(await parts())
      const filePaths = await getFilePaths(dirPath, {
        extension: this.extension,
        filters: options?.filters ? await options.filters() : undefined,
      })
      const lines: Array<string> = []
      for (const path of filePaths) {
        lines.push((await getFileContent(path)) ?? '')
      }
      return lines
    })
  }

  withFsDirPrint(
    parts: () => Promise<Array<string>>,
    options?: {
      filters?: () => Promise<Array<string>>
    },
  ): Cli {
    return this.withPrint(async () => {
      const dirPath = this.localDirPath(await parts())
      const filePaths = await getFilePaths(dirPath, {
        extension: this.extension,
        filters: options?.filters ? await options.filters() : undefined,
      })
      const lines: Array<string> = []
      for (const filePath of filePaths) {
        lines.push(toRelParts(dirPath, filePath).join(' '))
      }
      return lines.map(l => l.trimEnd())
    })
  }

  withFsFileLoad(parts: () => Promise<Array<string>>): Cli {
    return this.with(async () => {
      const path = `${this.localDirPath(await parts())}.${this.extension}`
      return [(await getFileContent(path)) ?? '']
    })
  }

  withFsFilePrint(parts: () => Promise<Array<string>>): Cli {
    return this.withPrint(async () => {
      const filePath = `${this.localDirPath(await parts())}.${this.extension}`
      const lines: Array<string> = []
      lines.push(toRelParts(this.dirPath, filePath).join(' '))
      return lines.map(l => l.trimEnd())
    })
  }

  withPrint(lines: () => Promise<Array<string>>): Cli {
    return this.with(async () =>
      (await lines()).map(l => `opPrint ${this.toInnerStr(l)}`),
    )
  }

  withPrintErr(lines: () => Promise<Array<string>>): Cli {
    return this.with(async () =>
      (await lines()).map(l => `opPrintErr ${this.toInnerStr(l)}`),
    )
  }

  withPrintInfo(lines: () => Promise<Array<string>>): Cli {
    return this.with(async () =>
      (await lines()).map(l => `opPrintInfo ${this.toInnerStr(l)}`),
    )
  }

  withPrintOp(lines: () => Promise<Array<string>>): Cli {
    return this.with(async () =>
      (await lines()).map(l => `opPrintCmd ${this.toInnerStr(l)}`),
    )
  }

  withPrintSucc(lines: () => Promise<Array<string>>): Cli {
    return this.with(async () =>
      (await lines()).map(l => `opPrintSucc ${this.toInnerStr(l)}`),
    )
  }

  withPrintWarn(lines: () => Promise<Array<string>>): Cli {
    return this.with(async () =>
      (await lines()).map(l => `opPrintWarn ${this.toInnerStr(l)}`),
    )
  }

  withTrace(): Cli {
    throw new Error('not implemented')
  }

  withVarArrSet(
    _name: () => Promise<string>,
    _values: () => Promise<Array<string>>,
  ): Cli {
    throw new Error('not implemented')
  }

  withVarSet(_name: () => Promise<string>, _value: () => Promise<string>): Cli {
    throw new Error('not implemented')
  }

  withVarUnset(_name: () => Promise<string>): Cli {
    throw new Error('not implemented')
  }
}
