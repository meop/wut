import { buildFilePath, getFilePaths, getFileContent, toRelParts } from './path'

export interface Sh {
  build(): Promise<string>

  with(lines: () => Promise<Array<string>>): Sh

  withEnvVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh
  withEval(lines: () => Promise<Array<string>>): Sh

  withFsDirLoad(
    parts: () => Promise<Array<string>>,
    options?: {
      filters?: () => Promise<Array<string>>
    },
  ): Sh
  withFsDirPrint(
    parts: () => Promise<Array<string>>,
    options?: {
      content?: boolean
      filters?: () => Promise<Array<string>>
      name?: boolean
    },
  ): Sh
  withFsFileLoad(parts: () => Promise<Array<string>>): Sh
  withFsFilePrint(
    parts: () => Promise<Array<string>>,
    options?: {
      content?: boolean
      name?: boolean
    },
  ): Sh

  withPrint(lines: () => Promise<Array<string>>): Sh
  withPrintErr(lines: () => Promise<Array<string>>): Sh
  withPrintInfo(lines: () => Promise<Array<string>>): Sh
  withPrintOp(lines: () => Promise<Array<string>>): Sh
  withPrintSucc(lines: () => Promise<Array<string>>): Sh
  withPrintWarn(lines: () => Promise<Array<string>>): Sh

  withTrace(): Sh

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Sh
  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh
  withVarUnset(name: () => Promise<string>): Sh
}

export class ShBase {
  lineBuilders: Array<() => Promise<string>> = []
  shName: string
  shExt: string

  dirPath: string

  constructor(shName: string, shExt: string) {
    this.shName = shName
    this.shExt = shExt

    this.dirPath = buildFilePath(import.meta.dir, 'sh', this.shName)
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
    throw new Error('not implemented')
  }

  with(lines: () => Promise<Array<string>>): Sh {
    this.lineBuilders.push(async () => (await lines()).join('\n'))
    return this
  }

  withEnvVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
    throw new Error('not implemented')
  }

  withEval(lines: () => Promise<Array<string>>): Sh {
    throw new Error('not implemented')
  }

  localDirPath(parts: Array<string>) {
    return buildFilePath(...[this.dirPath, ...parts])
  }

  withFsDirLoad(
    parts: () => Promise<Array<string>>,
    options?: {
      filters?: () => Promise<Array<string>>
    },
  ): Sh {
    return this.with(async () => {
      const dirPath = this.localDirPath(await parts())
      const filePaths = await getFilePaths(dirPath, {
        extension: this.shExt,
        filters: options?.filters ? await options.filters() : undefined,
      })
      const lines: Array<string> = []
      for (const path of filePaths) {
        lines.push(await getFileContent(path))
      }
      return lines
    })
  }

  withFsDirPrint(
    parts: () => Promise<Array<string>>,
    options?: {
      content?: boolean
      filters?: () => Promise<Array<string>>
      name?: boolean
    },
  ): Sh {
    return this.withPrint(async () => {
      const dirPath = this.localDirPath(await parts())
      const filePaths = await getFilePaths(dirPath, {
        extension: this.shExt,
        filters: options?.filters ? await options.filters() : undefined,
      })
      const lines: Array<string> = []
      for (const filePath of filePaths) {
        if (options?.name) {
          lines.push(toRelParts(dirPath, filePath).join(' '))
        }
        if (options?.content) {
          lines.push(await getFileContent(filePath))
        }
      }
      return lines.map(l => l.trimEnd())
    })
  }

  withFsFileLoad(parts: () => Promise<Array<string>>): Sh {
    return this.with(async () => {
      const path = `${this.localDirPath(await parts())}.${this.shExt}`
      return [await getFileContent(path)]
    })
  }

  withFsFilePrint(
    parts: () => Promise<Array<string>>,
    options?: {
      content?: boolean
      name?: boolean
    },
  ): Sh {
    return this.withPrint(async () => {
      const filePath = `${this.localDirPath(await parts())}.${this.shExt}`
      const lines: Array<string> = []
      if (options?.name) {
        lines.push(toRelParts(this.dirPath, filePath).join(' '))
      }
      if (options?.content) {
        lines.push(await getFileContent(filePath))
      }
      return lines.map(l => l.trimEnd())
    })
  }

  withPrint(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `shPrint ${this.toVal(l)}`),
    )
  }

  withPrintErr(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `shPrintErr ${this.toVal(l)}`),
    )
  }

  withPrintInfo(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `shPrintInfo ${this.toVal(l)}`),
    )
  }

  withPrintOp(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `shPrintOp ${this.toVal(l)}`),
    )
  }

  withPrintSucc(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `shPrintSucc ${this.toVal(l)}`),
    )
  }

  withPrintWarn(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `shPrintWarn ${this.toVal(l)}`),
    )
  }

  withTrace(): Sh {
    throw new Error('not implemented')
  }

  withVarArrSet(
    name: () => Promise<string>,
    values: () => Promise<Array<string>>,
  ): Sh {
    throw new Error('not implemented')
  }

  withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
    throw new Error('not implemented')
  }

  withVarUnset(name: () => Promise<string>): Sh {
    throw new Error('not implemented')
  }
}
