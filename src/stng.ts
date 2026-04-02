import { join } from '@std/path'
import { parse } from '@std/toml'

export interface Stng {
  srv: {
    hostname?: string
    port?: number
  }
  cfg: {
    dirs: string[]
  }
}

const env = Deno.env.get('WUT_ENV')
const filename = env ? `stng-${env}.toml` : 'stng.toml'
const settingsPath = join(import.meta.dirname ?? '', '..', filename)

export const SETTINGS = parse(await Deno.readTextFile(settingsPath)) as unknown as Stng
