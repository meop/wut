import { getCfgFilePath, getCfgFilePaths } from '../../cfg'
import type { Bin } from '../../cmd'
import { log } from '../../log'
import { isInPath, splitPath } from '../../path'
import { shellRun, type ShellOpts } from '../../sh'

export class Shell implements Bin {
  shellOpts: ShellOpts

  async _paths(names?: Array<string>) {
    const root = getCfgFilePath(['bin'])
    const filePaths = (await getCfgFilePaths(['bin'])).filter(p =>
      names?.every(n => p.toLowerCase().includes(n)),
    )
    const shells = new Set<string>()
    const bins: Array<{ shell: string; fsPath: string }> = []

    for (const filePath of filePaths) {
      const filePathParts = splitPath(filePath.replace(root, ''))
      filePathParts.shift()
      const shellName = filePathParts.shift() ?? ''
      if (!shellName) {
        continue
      }
      shells.add(shellName)
      bins.push({ shell: shellName, fsPath: filePath })
    }

    const shellsInPath: Array<string> = []
    for (const shell of shells) {
      if (await isInPath(shell, this.shellOpts)) {
        shellsInPath.push(shell)
      }
    }

    return bins.filter(({ shell }) => shellsInPath.includes(shell))
  }

  async list(names?: Array<string>) {
    for (const { fsPath } of await this._paths(names)) {
      log(fsPath)
    }
  }
  async run(names: Array<string>) {
    for (const { shell, fsPath } of await this._paths(names)) {
      await shellRun(`${shell} ${fsPath}`, { ...this.shellOpts, verbose: true })
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
