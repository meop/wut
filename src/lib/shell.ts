import * as cp from 'child_process'

import { log, logArg, logCmd, logError } from './log.ts'
import { sleep } from './time.ts'

export type ShellOpts = {
  dryRun?: boolean
  verbose?: boolean
}

export type ShellRunOpts = ShellOpts & {
  filters?: Array<string>
  pipeOutAndErr?: boolean
  reverseFilters?: boolean
  throwOnExitCode?: boolean
}

export type ShellStream = {
  stdout: Array<string>
  stderr: Array<string>
}

function getCmdAndCmdArgs(command: string, shellOpts?: ShellOpts) {
  const cmdArgs = command.split(' ')
  const cmd = cmdArgs.shift()

  if (shellOpts?.verbose) {
    logCmd(cmd! + ' ', false)
    logArg(cmdArgs.join(' '))
  }

  return { cmd, cmdArgs }
}

export async function shellRun(command: string, shellRunOpts?: ShellRunOpts) {
  const { cmd, cmdArgs } = getCmdAndCmdArgs(command, shellRunOpts)
  const fullCommand = cmd! + (cmdArgs.length > 0 ? ` ${cmdArgs.join(' ')}` : '')

  const shellStream: ShellStream = {
    stdout: [],
    stderr: [],
  }
  if (shellRunOpts?.dryRun) {
    return shellStream
  }

  let done = false
  let exitCode = 0

  let stdoutPartial = ''
  let stderrPartial = ''

  const filters = shellRunOpts?.filters ?? []
  const internalStream = shellRunOpts?.pipeOutAndErr || filters.length > 0

  const proc = cp.spawn(cmd!, cmdArgs, {
    shell: true,
    stdio: [
      'inherit',
      internalStream ? 'pipe' : 'inherit',
      internalStream ? 'pipe' : 'inherit',
    ],
  })

  proc.on('close', () => {
    done = true
  })

  proc.on('error', (err) => {
    logError(`running '${fullCommand}' produced error: ${err.message}\n`)
  })

  proc.on('exit', (code) => {
    exitCode = code ?? 0
  })

  const updateStream = (data: string, stream: 'out' | 'err') => {
    let dataStr = ''
    if (stream === 'out') {
      dataStr = stdoutPartial
      stdoutPartial = ''
    } else {
      dataStr = stderrPartial
      stderrPartial = ''
    }
    dataStr += data

    if (dataStr !== '') {
      const lines = dataStr.split('\n')
      const finalPartial = lines.pop() ?? ''
      if (stream === 'out') {
        stdoutPartial = finalPartial
      } else {
        stderrPartial = finalPartial
      }

      if (filters.length > 0) {
        for (const l of lines) {
          if (!l) {
            continue
          }
          for (const f of filters) {
            let match = l.toLowerCase().includes(f.toLowerCase())
            if (shellRunOpts?.reverseFilters) {
              match = !match
            }
            if (match) {
              if (stream === 'out') {
                shellStream.stdout!.push(l)
              } else {
                shellStream.stderr!.push(l)
              }
              log(l)
            }
          }
        }
      } else {
        if (stream === 'out') {
          shellStream.stdout.push(...lines)
        } else {
          shellStream.stderr.push(...lines)
        }
      }
    }
  }

  if (proc.stdout) {
    proc.stdout.on('data', (data) => {
      updateStream(String(data), 'out')
    })
  }

  if (proc.stderr) {
    proc.stderr.on('data', (data) => {
      updateStream(String(data), 'err')
    })
  }

  while (!done) {
    await sleep(100)
  }

  if (exitCode !== 0 && shellRunOpts?.throwOnExitCode) {
    throw new Error(
      `running '${fullCommand}' produced error code: ${exitCode}\n`,
    )
  }

  if (!shellRunOpts?.pipeOutAndErr) {
    return { stdout: [], stderr: [] }
  }

  return shellStream
}
