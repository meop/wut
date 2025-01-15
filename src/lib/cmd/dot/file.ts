import { getPlatDiffCmd, type Dot } from '../../cmd.ts'
import type { ShellOpts } from '../../shell.ts'

import path from 'path'

import { findConfigFilePaths, loadConfigFile } from '../../config.ts'
import { log } from '../../log.ts'
import { getPlat } from '../../os.ts'
import { getFilePathsInDirPath } from '../../path.ts'
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

  async _files(name: string) {
    return await findConfigFilePaths('dot', name)
  }

  async list(names?: Array<string>) {
    const fileConfig = await this._fileConfig(names)
    for (const name of Object.keys(fileConfig)) {
      log(name)
    }
  }
  async pull(names?: Array<string>) {
    const fileConfig = await this._fileConfig(names)
    for (const name of Object.keys(fileConfig)) {
      log(name)
    }
  }
  async push(names?: Array<string>) {
    const fileConfig = await this._fileConfig(names)
    for (const name of Object.keys(fileConfig)) {
      log(name)
    }
  }
  async stat(names?: Array<string>) {
    const fileConfig = await this._fileConfig(names)
    for (const name of Object.keys(fileConfig)) {
      const rootPath = path.join(
        process.env.WUT_CONFIG_LOCATION ?? '',
        'dot',
        name,
      )
      console.log(rootPath)
      const rootPathFilePaths = await getFilePathsInDirPath(rootPath)

      for (const fileConfigItem of fileConfig[name]) {
        const leftPath = path.join(rootPath, fileConfigItem.in)
        for (const filePath of rootPathFilePaths) {
          if (!filePath.startsWith(leftPath)) {
            continue
          }
          console.log(filePath)
          const plat = getPlat()
          let rightPath = fileConfigItem.out[plat]
          if (rightPath.includes('${')) {
            for (const e of Object.keys(process.env)) {
              rightPath = rightPath.replace(
                '${' + e + '}',
                process.env[e] ?? '',
              )
            }
          }

          await shellRun(
            getPlatDiffCmd(plat, leftPath, rightPath),
            this.shellOpts,
          )
        }
      }
    }
  }

  constructor(shellOpts?: ShellOpts) {
    this.shellOpts = shellOpts ?? {}
  }
}
