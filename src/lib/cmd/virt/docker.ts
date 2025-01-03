import { dirname } from 'path'
import { parseArgs } from 'util'

import { buildCmd } from '../../cmd.ts'
import { log, logError } from '../../log.ts'
import { execShell } from '../../shell.ts'

const __dirname = dirname(import.meta.dirname)

export function buildCmdDocker() {
  const cmd = buildCmd('docker', 'docker operations')
  .aliases([])
}

const { values, positionals } = parseArgs({
  args: process.argv,
  options: {
    dry_run: {
      type: 'boolean',
    },
  },
  strict: true,
  allowPositionals: true,
})

const hostWasProvided = positionals.length > 2
const host = hostWasProvided ? positionals[2] : ''
if (!hostWasProvided) {
  throw new Error('host was not provided')
}

const nameWasProvided = positionals.length > 3
const name = nameWasProvided ? positionals[3] : ''
if (!nameWasProvided) {
  throw new Error('name was not provided')
}

const stateWasProvided = positionals.length > 4
const state = stateWasProvided ? positionals[4] : ''
if (!nameWasProvided) {
  throw new Error('state was not provided')
}

const dry_run = values.dry_run === true

log(`host: ${host}`)
log(`name: ${name}`)
log(`--dry_run: ${dry_run}`)

try {
  const cmdParts = [
    'docker',
    '--context',
    host,
    'compose',
    '--file',
    `${__dirname}/../configs/docker/${host}/${name}.yml`,
  ]

  if (state === 'pull') {
    cmdParts.push('pull')
  } else if (state === 'up') {
    cmdParts.push('up', '--detach')
  } else if (state === 'down') {
    cmdParts.push('down')
  }

  const cmd = cmdParts.join(' ')

  await execShell(cmd, { dryRun: dry_run })
} catch (err) {
  if (err instanceof Error) {
    logError(err.message)
  }
}
