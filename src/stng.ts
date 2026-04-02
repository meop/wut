import { join } from '@std/path'
import { parse } from '@std/toml'

export interface Stng {
  srv: {
    hostname: string
    port: number
  }
  cfg: {
    dirs: string[]
  }
}

const env = Deno.env.get('WUT_ENV')
const filename = env ? `settings-${env}.toml` : 'settings.toml'
const settingsPath = join(import.meta.dirname ?? '', '..', filename)

// deno-lint-ignore no-explicit-any
const raw = parse(await Deno.readTextFile(settingsPath)) as any

export const SETTINGS: Stng = {
  srv: {
    hostname: raw.srv?.hostname ?? '0.0.0.0',
    port: raw.srv?.port ?? 80,
  },
  cfg: {
    dirs: raw.cfg?.dirs ?? [],
  },
}
