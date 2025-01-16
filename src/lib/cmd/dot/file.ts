import type { Dot } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import path from 'path'

import { getPlatDiffCmd } from '../../cmd.ts'
import { loadConfigFile } from '../../config.ts'
import { log, logWarn } from '../../log.ts'
import { getPlat } from '../../os.ts'
import {
  getFilePathsInPath,
  getPathStat,
  ensureDirPath,
  syncFilePath,
} from '../../path.ts'
import { shellRun } from '../../shell.ts'

type FileConfig = {
  [key: string]: [
    {
      in: string
      out: {
        linux: string
        macos: string
        windows: string
      }
    },
  ]
}

type FilePathPair = {
  left: string
  right: string
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
      if ((names?.length ?? 0) === 0 || names?.find((n) => key.includes(n))) {
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
              (f) => f.startsWith(inPath) && path.dirname(f) === inPath,
            )
          : [inPath]

        for (const filePath of filePaths) {
          let outPath = fileConfigItem.out[getPlat()]
          if (outPath.includes('${')) {
            for (const e of Object.keys(process.env)) {
              outPath = outPath.replace('${' + e + '}', process.env[e] ?? '')
              if (!outPath.includes('${')) {
                break
              }
            }
          }

          if (outPath === process.env.HOME) {
            throw new Error(
              `unsupported config: ${process.env.HOME} cannot be set as 'out' directly`,
            )
          }

          psc.filePairPaths.add({
            left: filePath,
            right: filePath.replace(inPath, outPath),
          })
          if (isDirSync) {
            psc.dirPaths.add(outPath)
          }
        }
      }
    }

    return psc
  }

  async list(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)

    for (const psPair of psc.filePairPaths) {
      log(`"${psPair.left}" <-> "${psPair.right}"`)
    }
  }
  async pull(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)

    for (const psPair of psc.filePairPaths) {
      await syncFilePath(psPair.right, psPair.left, this.shellOpts)
    }
  }
  async push(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)

    for (const psDir of psc.dirPaths) {
      await ensureDirPath(psDir, this.shellOpts, true)
    }

    for (const psPair of psc.filePairPaths) {
      await syncFilePath(psPair.left, psPair.right, this.shellOpts)
    }
  }
  async stat(names?: Array<string>) {
    const psc = await this._pathSyncConfig(names)
    for (const psPair of psc.filePairPaths) {
      if (await getPathStat(psPair.right)) {
        await shellRun(getPlatDiffCmd(getPlat(), psPair.left, psPair.right), {
          ...this.shellOpts,
          verbose: true,
        })
      } else {
        logWarn(`not yet in fs: ${psPair.right}`)
      }
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
