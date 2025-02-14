import { getCfgFilePath, getCfgFilePaths } from '../../cfg'
import type { Strap } from '../../cmd'
import { log } from '../../log'
import { isInPath, splitPath } from '../../path'
import { shellRun, type ShOpts } from '../../sh'

export class Shell implements Strap {
  shOpts: ShOpts

  async _paths(names?: Array<string>) {
    const pathParts = ['strap']
    const root = getCfgFilePath(pathParts)
    const filePaths = (await getCfgFilePaths(pathParts)).filter(p =>
      names?.every(n => p.toLowerCase().includes(n)),
    )
    const shells = new Set<string>()
    const straps: Array<{ shell: string; fsPath: string }> = []

    for (const filePath of filePaths) {
      const filePathParts = splitPath(filePath.replace(root, ''))
      filePathParts.shift()
      const shellName = filePathParts.shift() ?? ''
      if (!shellName) {
        continue
      }
      shells.add(shellName)
      straps.push({ shell: shellName, fsPath: filePath })
    }

    const shellsInPath: Array<string> = []
    for (const shell of shells) {
      if (await isInPath(shell, this.shOpts)) {
        shellsInPath.push(shell)
      }
    }

    return straps.filter(({ shell }) => shellsInPath.includes(shell))
  }

  async list(names?: Array<string>) {
    for (const { fsPath } of await this._paths(names)) {
      log(fsPath)
    }
  }
  async run(names: Array<string>) {
    for (const { shell, fsPath } of await this._paths(names)) {
      await shellRun(`${shell} ${fsPath}`, { ...this.shOpts, verbose: true })
    }
  }

  constructor(shOpts?: ShOpts) {
    this.shOpts = shOpts ?? {}
  }
}
