import path from 'node:path'

import { loadConfigFile } from '../../cfg'
import type { Dot } from '../../cmd'
import { log, logWarn } from '../../log'
import { getPlat } from '../../os'
import {
  ensureDirPath,
  getFilePathsInPath,
  getPathStat,
  getPlatDiffCmd,
  isInPath,
  type PathPermission,
  syncFilePath,
} from '../../path'
import { type ShellOpts, shellRun } from '../../sh'

type FileConfig = {
  [key: string]: [
    {
      in: string
      out: {
        linux: string
        macos: string
        windows: string
      }
      permission?: PathPermission
    },
  ]
}

type FilePathPair = {
  sourcePath: string
  targetPath: string
  targetPerm?: PathPermission
}

type PathSyncConfig = {
  dirPaths: Set<string>
  filePairPaths: Set<FilePathPair>
}

export class File implements Dot {
  shellOpts: ShellOpts

  async _fileConfig(names?: Array<string>) {
    const fileConfig: FileConfig = {}
    const config = await loadConfigFile(
      path.join(process.env.WUT_CONFIG_LOCATION ?? '', 'dot', 'file.yaml'),
    )

    for (const key of Object.keys(config)) {
      if ((names?.length ?? 0) === 0 || names?.find(n => key.includes(n))) {
        fileConfig[key] = config[key]
      }
    }
    return fileConfig
  }

  async _pathSyncConfig(names?: Array<string>) {
    const psc: PathSyncConfig = {
      dirPaths: new Set<string>(),
      filePairPaths: new Set<FilePathPair>(),
    }

    const fileConfig = await this._fileConfig(names)
    for (const name of Object.keys(fileConfig)) {
      if (!(await isInPath(name, this.shellOpts))) {
        continue
      }

      const fileConfigPath = path.join(
        process.env.WUT_CONFIG_LOCATION ?? '',
        'dot',
        name,
      )

      const fileConfigPaths = await getFilePathsInPath(fileConfigPath)

      for (const fileConfigItem of fileConfig[name]) {
        if (!fileConfigItem?.out[getPlat()]) {
          continue
        }

        const inPath = path.join(fileConfigPath, fileConfigItem.in)

        const isDirSync = (await getPathStat(inPath))?.isDirectory() ?? false

        const filePaths = isDirSync
          ? fileConfigPaths.filter(
              f => f.startsWith(inPath) && path.dirname(f) === inPath,
            )
          : [inPath]

        for (const filePath of filePaths) {
          let outPath = fileConfigItem.out[getPlat()]
          if (outPath.includes('${')) {
            for (const e of Object.keys(process.env)) {
              outPath = outPath.replace(`\${${e}}`, process.env[e] ?? '')
              if (!outPath.includes('${')) {
                break
              }
            }
          }

          if (outPath === process.env.HOME) {
            throw new Error(
              `unsupported config: ${outPath} cannot be set as 'out' directly`,
            )
          }

          psc.filePairPaths.add({
            sourcePath: filePath,
            targetPath: filePath.replace(inPath, outPath),
            targetPerm: fileConfigItem.permission,
          })
          if (isDirSync) {
            psc.dirPaths.add(outPath)
          }
        }
      }
    }

    return psc
  }

  async diff(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)
    for (const psPair of psc.filePairPaths) {
      if (await getPathStat(psPair.targetPath)) {
        await shellRun(
          getPlatDiffCmd(getPlat(), psPair.sourcePath, psPair.targetPath),
          {
            ...this.shellOpts,
            verbose: true,
          },
        )
      } else {
        logWarn(`not yet in fs: '${psPair.targetPath}'`)
      }
    }
  }
  async list(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)

    for (const psPair of psc.filePairPaths) {
      log(`"${psPair.sourcePath}" <-> "${psPair.targetPath}"`)
    }
  }
  async pull(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)

    for (const psPair of psc.filePairPaths) {
      await syncFilePath(
        psPair.targetPath,
        psPair.sourcePath,
        psPair.targetPerm,
        {
          ...this.shellOpts,
          verbose: true,
        },
      )
    }
  }
  async push(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)

    for (const psDir of psc.dirPaths) {
      await ensureDirPath(psDir, this.shellOpts, true)
    }

    for (const psPair of psc.filePairPaths) {
      await syncFilePath(
        psPair.sourcePath,
        psPair.targetPath,
        psPair.targetPerm,
        {
          ...this.shellOpts,
          verbose: true,
        },
      )
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
