import { join } from '@std/path'
import { parse } from '@std/toml'

export interface Settings {
  cfg_dirs: string[]
  port?: number
}

const env = Deno.env.get('WUT_ENV')
const filename = env ? `settings-${env}.toml` : 'settings.toml'
const settingsPath = join(import.meta.dirname ?? '', '..', filename)

export const settings = parse(await Deno.readTextFile(settingsPath)) as unknown as Settings
