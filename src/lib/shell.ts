import * as cp from 'child_process'
import util from 'util'

import { log, logArg, logCmd, logError } from './log.ts'
import { sleep } from './time.ts'

const exec = util.promisify(cp.exec)

export async function execShell(command: string) {
  return await exec(command, {
    encoding: 'utf8',
  })
}

export async function spawnShell(command: string) {
  const cmdArgs = command.split(' ')
  const cmd = cmdArgs.shift()

  logCmd(cmd! + ' ', false)
  logArg(cmdArgs.join(' '))
  const proc = cp.spawn(cmd!, cmdArgs, {
    shell: true,
    stdio: 'inherit',
  })

  let done = false
  proc.on('close', () => {
    done = true
  })

  proc.on('error', (err) => {
    logError(`could not run ${command}: ${err.message}\n`)
  })

  // proc.stdout.setEncoding('utf8')
  // proc.stdout.on('data', (data) => {
  //   log(data, false)
  // })

  // proc.stderr.setEncoding('utf8')
  // proc.stderr.on('data', (data) => {
  //   logError(data, false)
  // })

  while (!done) {
    await sleep(100)
  }
}

export async function filterShell(
  command: string,
  filter: Array<string>,
) {
  if (filter.length > 0) {
    for (const f of filter!) {
      const o = await execShell(command)
      for (const line of o.stdout.split('\n')) {
        if (line.includes(f)) {
          log(line)
        }
      }
    }
  } else {
    await spawnShell(command)
  }
}
