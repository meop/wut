// the oldest of each shell wut's scripts are written for. nu's is also the one clients run when nushell's latest cannot
// be looked up (nu.ts), and the one the tests run
export const VERSIONS: Record<string, { major: number; minor: number; patch: number }> = {
  nu: { major: 0, minor: 116, patch: 0 },
  pwsh: { major: 7, minor: 6, patch: 0 },
  zsh: { major: 5, minor: 9, patch: 0 },
}
