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

// nu isn't guaranteed to be on PATH yet, so invoke wut's own pinned binary instead
function pinnedNuBinCmd(shell: Sh, sysOsPlat: string): string {
  const ext = sysOsPlat === 'winnt' ? '.exe' : ''
  return shell.name === 'pwsh'
    ? `& "\${env:WUT_HOME}/bin/nu${ext}"`
    : shell.name === 'zsh'
    ? `"\${WUT_HOME}/bin/nu${ext}"`
    : `^($env.WUT_HOME | path join 'bin' 'nu${ext}')`
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

  const bin = target === 'nu' ? pinnedNuBinCmd(shell, context.sys_os_plat ?? '') : target
  return `${bin} ${targetShell.execArgs(shell.toLiteral(script))}`
}

// always hops to the pinned nu, even if already running as (unpinned) nu — the marker param tracks that
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

  const bin = pinnedNuBinCmd(shell, context.sys_os_plat ?? '')
  return `${bin} ${targetShell.execArgs(shell.toLiteral(script))}`
}

export function execNativeShell(shell: Sh, plat: string, cmd: string): string {
  const target = sysOsPlatToNativeShell[plat]
  const targetShell = target === 'pwsh' ? new PowerSh() : new ZSh()
  return `${target} ${targetShell.execArgs(shell.toLiteral(cmd))}`
}

export function execScriptShell(shell: Sh, plat: string, shellFlavor: string, cmd: string): string {
  if (shellFlavor === 'nu') {
    const targetShell = new NuSh()
    return `${pinnedNuBinCmd(shell, plat)} ${targetShell.execArgs(shell.toLiteral(cmd))}`
  }
  return execNativeShell(shell, plat, cmd)
}
