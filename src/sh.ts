import type { Ctx } from '@meop/shire/ctx'
import type { Sh } from '@meop/shire/sh'
import { NuSh } from '@meop/shire/sh/nu'
import { PowerSh } from '@meop/shire/sh/pwsh'
import { ZSh } from '@meop/shire/sh/zsh'

const REQ_URL_SH = ['req', 'url', 'sh']
const WUT_NU_PINNED_PARAM = 'wutNuPinned=1'

const sysOsPlatToNativeShell: Record<string, string> = {
  darwin: 'zsh',
  linux: 'zsh',
  winnt: 'pwsh',
}

export async function redirectShell(shell: Sh, target: string, context: Ctx): Promise<string | null> {
  if (shell.name === target) {
    return null
  }

  const url = [
    context.req_orig,
    context.req_path.replace(`/sh/${shell.name}`, `/sh/${target}`),
    context.req_srch,
  ].join('')

  let targetShell: NuSh | PowerSh | ZSh
  switch (target) {
    case 'nu':
      targetShell = new NuSh()
      break
    case 'pwsh':
      targetShell = new PowerSh()
      break
    case 'zsh':
      targetShell = new ZSh()
      break
    default:
      return null
  }

  const script = targetShell
    .with(targetShell.varSetStr(REQ_URL_SH, url))
    .with(await targetShell.fileLoad(['get']))
    .build()
  return `${target} ${targetShell.execArgs(shell.toLiteral(script))}`
}

// pack/file/virt need a guarantee they're running under wut's pinned nu, not whatever nu (if any) happens to be
// on the caller's PATH. Unlike redirectShell above, this always targets the pinned binary explicitly and never
// short-circuits on `shell.name === 'nu'` alone, since being nu doesn't mean being *pinned* nu — the marker query
// param on the re-fetched URL is what distinguishes "first pass" from "already hopped" for a nu caller (pwsh/zsh
// callers never carry it themselves, so they always hop, exactly once, same as before).
export async function redirectCommonShell(shell: Sh, context: Ctx): Promise<string | null> {
  if (context.req_srch.includes(WUT_NU_PINNED_PARAM)) {
    return null
  }

  const url = [
    context.req_orig,
    context.req_path.replace(`/sh/${shell.name}`, '/sh/nu'),
    context.req_srch,
    context.req_srch ? '&' : '?',
    WUT_NU_PINNED_PARAM,
  ].join('')

  const targetShell = new NuSh()
  const script = targetShell
    .with(targetShell.varSetStr(REQ_URL_SH, url))
    .with(await targetShell.fileLoad(['get']))
    .build()

  const ext = context.sys_os_plat === 'winnt' ? '.exe' : ''
  const bin = shell.name === 'pwsh'
    ? `& "\${env:WUT_HOME}/bin/nu${ext}"`
    : shell.name === 'zsh'
    ? `"\${WUT_HOME}/bin/nu${ext}"`
    : `^($env.WUT_HOME | path join 'bin' 'nu${ext}')`

  return `${bin} ${targetShell.execArgs(shell.toLiteral(script))}`
}

export function execNativeShell(shell: Sh, plat: string, cmd: string): string {
  const target = sysOsPlatToNativeShell[plat]
  const targetShell = target === 'pwsh' ? new PowerSh() : new ZSh()
  return `${target} ${targetShell.execArgs(shell.toLiteral(cmd))}`
}
