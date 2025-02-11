import * as cp from 'node:child_process'

import { log, logArg, logCmd, logError } from './log'
import { sleep } from './time'

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

export type StdStreamSplit = {
  out: Array<string>
  err: Array<string>
}

type StdStream = Array<{
  std: string
  val: string
}>

function getCmdAndCmdArgs(command: string, shellOpts?: ShellOpts) {
  const cmdArgs = command.split(' ').filter(c => c)
  const cmd = cmdArgs.shift() ?? ''
  const cmdArgsFull = cmdArgs.join(' ').trim()

  if (shellOpts?.verbose) {
    logCmd(cmd, false)
    if (cmdArgsFull) {
      logArg(` ${cmdArgsFull}`)
    }
  }

  return { cmd, cmdArgs }
}

export async function shellRun(command: string, shellRunOpts?: ShellRunOpts) {
  const { cmd, cmdArgs } = getCmdAndCmdArgs(command, shellRunOpts)
  const cmdArgsFull = cmdArgs.join(' ').trim()
  const fullCmd = cmdArgsFull ? `${cmd} ${cmdArgsFull}` : cmd

  if (shellRunOpts?.dryRun) {
    return {
      out: [],
      err: [],
    }
  }

  let done = false
  let exitCode = 0
  const stdStream: StdStream = []
  const stdPartial = {
    out: '',
    err: '',
  }

  const filters = shellRunOpts?.filters ?? []
  const internalStream = shellRunOpts?.pipeOutAndErr || filters.length

  const proc = cp.spawn(cmd, cmdArgs, {
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

  proc.on('error', err => {
    logError(`running: '${fullCmd}' | produced error: '${err.message}'`)
  })

  proc.on('exit', code => {
    exitCode = code ?? 0
  })

  const updateStream = (data: string, std: 'out' | 'err') => {
    if (data === '') {
      return
    }
    const dataStr = `${stdPartial[std]}${data}`
    const lines = dataStr.split('\n')
    stdPartial[std] = lines.pop() ?? ''
    for (const l of lines) {
      stdStream.push({ std, val: l })
    }
  }

  if (proc.stdout) {
    proc.stdout.on('data', data => {
      updateStream(String(data), 'out')
    })
  }

  if (proc.stderr) {
    proc.stderr.on('data', data => {
      updateStream(String(data), 'err')
    })
  }

  while (!done) {
    await sleep(100)
  }

  if (exitCode !== 0 && shellRunOpts?.throwOnExitCode) {
    throw new Error(`running '${fullCmd}' produced error code: ${exitCode}\n`)
  }

  const stdStreamSplit: StdStreamSplit = {
    out: [],
    err: [],
  }

  // moved filtering to after the proc ends
  // because logging in the pipe handler
  // was prefixing extra spacing to console for some reason
  for (const s of stdStream) {
    if (filters.length) {
      for (const filter of filters) {
        let match = s.val.toLowerCase().includes(filter)
        if (shellRunOpts?.reverseFilters) {
          match = !match
        }
        if (match) {
          if (shellRunOpts?.pipeOutAndErr) {
            stdStreamSplit[s.std].push(s.val)
          } else {
            log(s.val)
          }
        }
      }
    } else {
      stdStreamSplit[s.std].push(s.val)
    }
  }

  return stdStreamSplit
}
