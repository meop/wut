import path from 'node:path'

import { getBaseFilePaths } from '../../base'
import { getCfgFilePaths } from '../../cfg'
import type { Exec } from '../../cmd'
import { log } from '../../log'
import { isInPath } from '../../path'
import { shellRun, type ShOpts } from '../../sh'

const validExts = {
  zsh: 'zsh',
  ps1: 'pwsh',
}

export class Shell implements Exec {
  pathIsCfg: boolean
  pathParts: Array<string>
  shOpts: ShOpts

  async _paths(names?: Array<string>) {
    const filePaths = this.pathIsCfg
      ? await getCfgFilePaths(this.pathParts, names)
      : await getBaseFilePaths(this.pathParts, names)

    const shells = new Set<string>()
    const straps: Array<{ shell: string; fsPath: string }> = []

    for (const filePath of filePaths) {
      const extension = path.parse(filePath).ext.split('.').pop() ?? ''
      if (extension in validExts) {
        const shellName = validExts[extension]
        shells.add(shellName)
        straps.push({ shell: shellName, fsPath: filePath })
      }
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

  constructor(pathIsCfg?: boolean, pathParts?: Array<string>, shOpts?: ShOpts) {
    this.pathIsCfg = pathIsCfg ?? false
    this.pathParts = pathParts ?? []
    this.shOpts = shOpts ?? {}
  }
}
