import { join } from '@std/path'
import { parse } from '@std/yaml'

type Generator = { outputs: Array<string>; command: Array<string> }
const running = new Map<string, Promise<void>>()

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path)
    return true
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false
    }
    throw error
  }
}

function sourcePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.includes('\\')) {
    return false
  }
  const parts = path.split('/')
  return parts.length >= 4 && parts[0] === 'file' && parts[2] === 'secret' &&
    parts.every((part) => part !== '' && part !== '.' && part !== '..')
}

export async function ensureGeneratedSources(root: string, parts: Array<string>): Promise<void> {
  const segments = parts.flatMap((part) => part.split('/'))
  if (segments[0] !== 'file' || segments.some((part) => part === '..')) {
    return
  }
  let raw: string
  try {
    raw = await Deno.readTextFile(join(root, 'generate.yaml'))
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return
    }
    throw error
  }
  const manifest = parse(raw)
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('generate.yaml must contain named source generators')
  }
  const requested = segments.join('/')
  for (const [name, value] of Object.entries(manifest)) {
    const generator = value as Generator
    if (
      !generator || !Array.isArray(generator.outputs) || !generator.outputs.length ||
      !generator.outputs.every(sourcePath) || !Array.isArray(generator.command) ||
      !generator.command.length || !generator.command.every((arg) => typeof arg === 'string' && arg.length)
    ) {
      throw new Error(`invalid source generator: ${name}`)
    }
    if (!generator.outputs.some((path) => path === requested || path.startsWith(`${requested}/`))) {
      continue
    }
    const key = `${root}\0${name}`
    const previous = running.get(key)
    if (previous) {
      await previous
      continue
    }
    const operation = (async () => {
      const present = await Promise.all(generator.outputs.map((path) => exists(join(root, path))))
      if (present.every(Boolean)) {
        return
      }
      const [command, ...args] = generator.command
      const result = await new Deno.Command(command, {
        args,
        cwd: root,
        env: { WUT_CFG_DIR: root },
        stdin: 'null',
        stdout: 'null',
        stderr: 'null',
      }).output()
      if (!result.success) {
        throw new Error(`source generator ${name} failed (exit ${result.code})`)
      }
      if (!(await Promise.all(generator.outputs.map((path) => exists(join(root, path))))).every(Boolean)) {
        throw new Error(`source generator ${name} did not create its declared outputs`)
      }
    })()
    running.set(key, operation)
    try {
      await operation
    } finally {
      running.delete(key)
    }
  }
}
