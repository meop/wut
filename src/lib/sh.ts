import { buildFilePath, getFilePaths, getFileText } from './path'

export interface Sh {
  build(): Promise<string>

  with(lines: () => Promise<Array<string>>): Sh

  withEval(lines: () => Promise<Array<string>>): Sh

  withFsDirList(
    parts: () => Promise<Array<string>>,
    filters?: () => Promise<Array<string>>,
  ): Sh
  withFsDirLoad(
    parts: () => Promise<Array<string>>,
    filters?: () => Promise<Array<string>>,
  ): Sh
  withFsFileLoad(parts: () => Promise<Array<string>>): Sh

  withPathsPrintInfo(
    dirPath: () => Promise<string>,
    filePaths: () => Promise<Array<string>>,
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

  withEval(lines: () => Promise<Array<string>>): Sh {
    throw new Error('not implemented')
  }

  localDirPath(parts: Array<string>) {
    return buildFilePath(...[this.dirPath, ...parts])
  }

  async getFsFiles(dirPath: string, filters?: Array<string>) {
    return await getFilePaths(dirPath, {
      extension: this.shExt,
      filters,
    })
  }

  withFsDirList(
    parts: () => Promise<Array<string>>,
    filters?: () => Promise<Array<string>>,
  ): Sh {
    const dirPath = async () => this.localDirPath(await parts())
    return this.withPathsPrintInfo(dirPath, async () =>
      this.getFsFiles(await dirPath(), filters ? await filters() : undefined),
    )
  }

  withFsDirLoad(
    parts: () => Promise<Array<string>>,
    filters?: () => Promise<Array<string>>,
  ): Sh {
    const dirPath = async () => this.localDirPath(await parts())
    this.lineBuilders.push(async () => {
      const filePaths = await this.getFsFiles(
        await dirPath(),
        filters ? await filters() : undefined,
      )

      return (await Promise.all(filePaths.map(f => getFileText(f)))).join('\n')
    })
    return this
  }

  withFsFileLoad(parts: () => Promise<Array<string>>): Sh {
    const dirPath = async () => this.localDirPath(await parts())
    this.lineBuilders.push(async () =>
      getFileText(`${await dirPath()}.${this.shExt}`),
    )
    return this
  }

  withPathsPrintInfo(
    dirPath: () => Promise<string>,
    filePaths: () => Promise<Array<string>>,
  ): Sh {
    return this.withPrintInfo(async () => {
      const dir = await dirPath()
      const files = await filePaths()
      return files.map(f =>
        f
          .replaceAll(dir, '')
          .replaceAll('/', ' ')
          .replaceAll(`.${this.shExt}`, ''),
      )
    })
  }

  withPrint(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `print ${this.toVal(l)}`),
    )
  }

  withPrintErr(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `printErr ${this.toVal(l)}`),
    )
  }

  withPrintInfo(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `printInfo ${this.toVal(l)}`),
    )
  }

  withPrintOp(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `printOp ${this.toVal(l)}`),
    )
  }

  withPrintSucc(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `printSucc ${this.toVal(l)}`),
    )
  }

  withPrintWarn(lines: () => Promise<Array<string>>): Sh {
    return this.with(async () =>
      (await lines()).map(l => `printWarn ${this.toVal(l)}`),
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
