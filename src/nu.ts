import { SETTINGS } from './stng.ts'
import { VERSIONS } from './vers.ts'

type Vers = { major: number; minor: number; patch: number }

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

let known: { vers: Vers; until: number } | undefined

// the nu every client runs: nushell's latest release, looked up at most once a day, so a new one reaches every host
// without a change here. when github cannot be asked, the last one found stands, or vers.ts's before any is, and it is
// asked again within the hour
export async function nuVersion(): Promise<Vers> {
  if (!SETTINGS.nu.latest) {
    return VERSIONS.nu
  }
  if (known && Date.now() < known.until) {
    return known.vers
  }
  const latest = await latestNu()
  known = latest
    ? { vers: latest, until: Date.now() + DAY }
    : { vers: known?.vers ?? VERSIONS.nu, until: Date.now() + HOUR }
  return known.vers
}

// where the release page's latest redirects names the tag: a plain page, so no token and no api rate limit
async function latestNu(): Promise<Vers | undefined> {
  try {
    const res = await fetch('https://github.com/nushell/nushell/releases/latest', {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })
    await res.body?.cancel()
    const tag = res.headers.get('location')?.split('/tag/')[1]
    const m = tag?.match(/^(\d+)\.(\d+)\.(\d+)$/)
    return m ? { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) } : undefined
  } catch {
    return undefined
  }
}
