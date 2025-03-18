import { getFilePath, getFilePaths } from '../path'

export type ShVarOpts = {
  doubleQ?: boolean
  singleQ?: boolean
}

export interface Sh {
  build(): Promise<string>

  with(line: string): Sh
  withLoadDirPath(...parts: Array<string>): Sh
  withLoadFilePath(...parts: Array<string>): Sh
  withLog(line: string): Sh
  withLogErr(line: string): Sh
  withLogInfo(line: string): Sh
  withLogOp(line: string): Sh
  withLogSucc(line: string): Sh
  withLogWarn(line: string): Sh
  withSetVar(name: string, value: number | string, opts?: ShVarOpts): Sh
}

export class SysSh implements Sh {
  lineBuilders: Array<() => Promise<string>> = []
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

  with(line: string): Sh {
    this.lineBuilders.push(async () => line)
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
        `${await getFilePath(this.localParts(parts))}.${this.shExt}`,
      ).text()
    })
    return this
  }

  withLog(line: string): Sh {
    this.lineBuilders.push(async () => `wutLog ${line}`)
    return this
  }

  withLogErr(line: string): Sh {
    this.lineBuilders.push(async () => `wutLogErr ${line}`)
    return this
  }

  withLogInfo(line: string): Sh {
    this.lineBuilders.push(async () => `wutLogInfo ${line}`)
    return this
  }

  withLogOp(line: string): Sh {
    this.lineBuilders.push(async () => `wutLogOp ${line}`)
    return this
  }

  withLogSucc(line: string): Sh {
    this.lineBuilders.push(async () => `wutLogSucc ${line}`)
    return this
  }

  withLogWarn(line: string): Sh {
    this.lineBuilders.push(async () => `wutLogWarn ${line}`)
    return this
  }

  withSetVar(name: string, value: number | string, opts?: ShVarOpts): Sh {
    this.lineBuilders.push(async () => {
      let fullValue = value
      if (opts?.singleQ === true) {
        fullValue = `'${value}'`
      } else if (opts?.doubleQ === true) {
        fullValue = `"${value}"`
      }
      return `${name}=${fullValue}`
    })
    return this
  }
}
