import * as cp from 'child_process'
import util from 'util'

import { log, logArg, logCmd, logError } from './log.ts'
import { sleep } from './time.ts'

const exec = util.promisify(cp.exec)

function getCmdAndCmdArgs(
  command: string,
  options?: {
    asRoot?: boolean
    dryRun?: boolean
    verbose?: boolean
  },
) {
  const fullCommand = (options?.asRoot ? 'sudo ' : '') + command
  const cmdArgs = fullCommand.split(' ')
  const cmd = cmdArgs.shift()

  if (options?.verbose) {
    logCmd(cmd! + ' ', false)
    logArg(cmdArgs.join(' '))
  }

  return { cmd, cmdArgs }
}

export async function execShell(
  command: string,
  options?: {
    asRoot?: boolean
    dryRun?: boolean
    verbose?: boolean
  },
) {
  const { cmd, cmdArgs } = getCmdAndCmdArgs(command, options)
  const fullCommand = cmd! + ' ' + cmdArgs.join(' ')

  if (options?.dryRun) {
    return {
      stdout: '',
      stderr: '',
    }
  }

  return await exec(`${fullCommand}`, {
    encoding: 'utf8',
  })
}

export async function spawnShell(
  command: string,
  options?: {
    asRoot?: boolean
    dryRun?: boolean
    verbose?: boolean
  },
) {
  const { cmd, cmdArgs } = getCmdAndCmdArgs(command, options)
  const fullCommand = cmd! + ' ' + cmdArgs.join(' ')
  let exitCode = 0

  if (options?.dryRun) {
    return
  }

  const proc = cp.spawn(cmd!, cmdArgs, {
    shell: true,
    stdio: options?.verbose ? 'inherit' : 'pipe',
  })

  let done = false
  proc.on('close', () => {
    done = true
  })

  proc.on('error', (err) => {
    logError(`running '${fullCommand}' produced error: ${err.message}\n`)
  })

  proc.on('exit', (code) => {
    exitCode = code ?? 0
  })

  while (!done) {
    await sleep(100)
  }

  if (exitCode !== 0) {
    throw new Error(
      `running '${fullCommand}' produced error code: ${exitCode}\n`,
    )
  }
}

export async function runShell(
  command: string,
  options?: {
    asRoot?: boolean
    dryRun?: boolean
    filter?: Array<string>
    verbose?: boolean
  },
) {
  if (options?.filter && options?.filter.length > 0) {
    const o = await execShell(command, options)
    for (const line of o.stdout.split('\n')) {
      for (const f of options.filter) {
        if (line.toLowerCase().includes(f.toLowerCase())) {
          log(line)
        }
      }
    }
  } else {
    await spawnShell(command, options)
  }
}
