import { getFilePath, getFilePaths } from './path'

export type ShValOpts = {
  doubleQuote?: boolean
  singleQuote?: boolean
}

export interface Sh {
  build(): Promise<string>

  with(lines: Array<string>): Sh
  withLoadDirPath(...parts: Array<string>): Sh
  withLoadFilePath(...parts: Array<string>): Sh
  withLog(lines: Array<string>, opts?: ShValOpts): Sh
  withLogErr(lines: Array<string>, opts?: ShValOpts): Sh
  withLogInfo(lines: Array<string>, opts?: ShValOpts): Sh
  withLogOp(lines: Array<string>, opts?: ShValOpts): Sh
  withLogSucc(lines: Array<string>, opts?: ShValOpts): Sh
  withLogWarn(lines: Array<string>, opts?: ShValOpts): Sh
  withSetVar(name: string, value: string, opts?: ShValOpts): Sh
}

export class ShBase implements Sh {
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

  toVal(value: string, opts?: ShValOpts): string {
    if (opts?.doubleQuote === true) {
      return `"${value}"`
    }
    if (opts?.singleQuote === true) {
      return `'${value}'`
    }
    return value
  }

  with(lines: Array<string>): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => line)
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
        `${await getFilePath(this.localParts(parts))}.${this.shExt}`,
      ).text()
    })
    return this
  }

  withLog(lines: Array<string>, opts?: ShValOpts): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `wutLog ${this.toVal(line, opts)}`)
    }
    return this
  }

  withLogErr(lines: Array<string>, opts?: ShValOpts): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `wutLogErr ${this.toVal(line, opts)}`)
    }
    return this
  }

  withLogInfo(lines: Array<string>, opts?: ShValOpts): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `wutLogInfo ${this.toVal(line, opts)}`)
    }
    return this
  }

  withLogOp(lines: Array<string>, opts?: ShValOpts): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `wutLogOp ${this.toVal(line, opts)}`)
    }
    return this
  }

  withLogSucc(lines: Array<string>, opts?: ShValOpts): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `wutLogSucc ${this.toVal(line, opts)}`)
    }
    return this
  }

  withLogWarn(lines: Array<string>, opts?: ShValOpts): Sh {
    for (const line of lines) {
      this.lineBuilders.push(async () => `wutLogWarn ${this.toVal(line, opts)}`)
    }
    return this
  }

  withSetVar(name: string, value: string, opts?: ShValOpts): Sh {
    this.lineBuilders.push(async () => {
      return `${name}=${this.toVal(value, opts)}`
    })
    return this
  }
}
