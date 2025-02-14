import path from 'node:path'

import { getCfgFilePath, getCfgFilePaths, loadCfgFileContents } from '../../cfg'
import type { Dot } from '../../cmd'
import { log, logWarn } from '../../log'
import { getPlat } from '../../os'
import {
  type AclPerm,
  ensureDirPath,
  getPathStat,
  getPlatDiffCmd,
  isInPath,
  syncFilePath,
} from '../../path'
import { type ShellOpts, shellRun } from '../../sh'

type Sync = {
  [key: string]: [
    {
      in: string
      out: {
        linux: string
        macos: string
        windows: string
      }
      perm?: AclPerm
    },
  ]
}

type FileSync = {
  sourceFilePath: string
  targetFilePath: string
  targetFilePerm?: AclPerm
}

type DotFileSync = {
  dirPaths: Set<string>
  fileSyncs: Set<FileSync>
}

export class File implements Dot {
  shellOpts: ShellOpts

  async _dotFileSync(names?: Array<string>) {
    const dotFileSync: DotFileSync = {
      dirPaths: new Set<string>(),
      fileSyncs: new Set<FileSync>(),
    }

    const sync: Sync = await loadCfgFileContents(
      getCfgFilePath(['dot', 'file.yaml']),
    )

    for (const toolName of Object.keys(sync)) {
      if (!(await isInPath(toolName, this.shellOpts))) {
        continue
      }

      for (const syncItem of sync[toolName]) {
        if (!syncItem?.out[getPlat()]) {
          continue
        }

        const inPath = getCfgFilePath(['dot', 'file', toolName, syncItem.in])
        if (names?.length) {
          if (!names.every(n => inPath.toLowerCase().includes(n))) {
            continue
          }
        }

        const inPathIsDir = (await getPathStat(inPath))?.isDirectory() ?? false
        const inPaths = inPathIsDir
          ? await getCfgFilePaths(['dot', toolName, syncItem.in])
          : [inPath]

        for (const p of inPaths) {
          let outPath = syncItem.out[getPlat()]
          if (outPath.includes('${')) {
            for (const e of Object.keys(process.env)) {
              outPath = outPath.replace(`\${${e}}`, process.env[e] ?? '')
              if (!outPath.includes('${')) {
                break
              }
            }
          }

          const targetFilePath = p.replace(inPath, outPath)

          dotFileSync.fileSyncs.add({
            sourceFilePath: p,
            targetFilePath,
            targetFilePerm: syncItem.perm,
          })

          if (inPathIsDir) {
            dotFileSync.dirPaths.add(path.dirname(targetFilePath))
          }
        }
      }
    }

    return dotFileSync
  }

  async diff(names?: Array<string>) {
    const dotFileSync = await this._dotFileSync(names)

    for (const fileSync of dotFileSync.fileSyncs) {
      if (await getPathStat(fileSync.targetFilePath)) {
        await shellRun(
          getPlatDiffCmd(
            getPlat(),
            fileSync.sourceFilePath,
            fileSync.targetFilePath,
          ),
          {
            ...this.shellOpts,
            verbose: true,
          },
        )
      } else {
        logWarn(`not yet in fs: '${fileSync.targetFilePath}'`)
      }
    }
  }
  async list(names?: Array<string>) {
    const dotFileSync = await this._dotFileSync(names)

    for (const fileSync of dotFileSync.fileSyncs) {
      log(`'${fileSync.sourceFilePath}' <-> '${fileSync.targetFilePath}'`)
    }
  }
  async pull(names?: Array<string>) {
    const dotFileSync = await this._dotFileSync(names)

    for (const fileSync of dotFileSync.fileSyncs) {
      await syncFilePath(
        fileSync.targetFilePath,
        fileSync.sourceFilePath,
        fileSync.targetFilePerm,
        this.shellOpts,
      )
    }
  }
  async push(names?: Array<string>) {
    const dotFileSync = await this._dotFileSync(names)

    for (const dirPath of dotFileSync.dirPaths) {
      await ensureDirPath(
        dirPath,
        {
          ...this.shellOpts,
          verbose: true,
        },
        true,
      )
    }

    for (const fileSync of dotFileSync.fileSyncs) {
      await syncFilePath(
        fileSync.sourceFilePath,
        fileSync.targetFilePath,
        fileSync.targetFilePerm,
        this.shellOpts,
      )
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
