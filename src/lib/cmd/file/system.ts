import path from 'node:path'

import { getCfgFilePath, getCfgFilePaths, loadCfgFileContents } from '../../cfg'
import type { File } from '../../cmd'
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
import { type ShOpts, shellRun } from '../../sh'

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
  sourcePath: string
  targetPath: string
  targetPerm?: AclPerm
}

type GroupFileSync = {
  dirPaths: Set<string>
  fileSyncs: Set<FileSync>
}

export class System implements File {
  shOpts: ShOpts

  async _groupFileSync(names?: Array<string>) {
    const groupFileSync: GroupFileSync = {
      dirPaths: new Set<string>(),
      fileSyncs: new Set<FileSync>(),
    }

    const sync: Sync = await loadCfgFileContents(getCfgFilePath(['file.yaml']))

    for (const toolName of Object.keys(sync)) {
      if (!(await isInPath(toolName, this.shOpts))) {
        continue
      }

      for (const syncItem of sync[toolName]) {
        if (!syncItem?.out[getPlat()]) {
          continue
        }
        const pathParts = ['file', toolName, syncItem.in]
        const inPath = getCfgFilePath(pathParts)
        if (names?.length) {
          if (!names.every(n => inPath.toLowerCase().includes(n))) {
            continue
          }
        }
        const inPathIsDir = (await getPathStat(inPath))?.isDirectory() ?? false
        const inPaths = inPathIsDir
          ? await getCfgFilePaths(pathParts)
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
          const targetPath = p.replace(inPath, outPath)
          groupFileSync.fileSyncs.add({
            sourcePath: p,
            targetPath,
            targetPerm: syncItem.perm,
          })
          if (inPathIsDir) {
            groupFileSync.dirPaths.add(path.parse(targetPath).dir)
          }
        }
      }
    }

    return groupFileSync
  }

  async diff(names?: Array<string>) {
    const groupFileSync = await this._groupFileSync(names)

    for (const fileSync of groupFileSync.fileSyncs) {
      if (await getPathStat(fileSync.targetPath)) {
        await shellRun(
          getPlatDiffCmd(getPlat(), fileSync.sourcePath, fileSync.targetPath),
          {
            ...this.shOpts,
            verbose: true,
          },
        )
      } else {
        logWarn(`not yet in fs: '${fileSync.targetPath}'`)
      }
    }
  }
  async list(names?: Array<string>) {
    const groupFileSync = await this._groupFileSync(names)

    for (const fileSync of groupFileSync.fileSyncs) {
      log(`'${fileSync.sourcePath}' <-> '${fileSync.targetPath}'`)
    }
  }
  async pull(names?: Array<string>) {
    const groupFileSync = await this._groupFileSync(names)

    for (const fileSync of groupFileSync.fileSyncs) {
      await syncFilePath(
        fileSync.targetPath,
        fileSync.sourcePath,
        fileSync.targetPerm,
        this.shOpts,
      )
    }
  }
  async push(names?: Array<string>) {
    const groupFileSync = await this._groupFileSync(names)

    for (const dirPath of groupFileSync.dirPaths) {
      await ensureDirPath(
        dirPath,
        {
          ...this.shOpts,
          verbose: true,
        },
        true,
      )
    }

    for (const fileSync of groupFileSync.fileSyncs) {
      await syncFilePath(
        fileSync.sourcePath,
        fileSync.targetPath,
        fileSync.targetPerm,
        this.shOpts,
      )
    }
  }

  constructor(shOpts?: ShOpts) {
    this.shOpts = shOpts ?? {}
  }
}
