import type { Ctx } from '@meop/shire/ctx'
import type { Sh } from '@meop/shire/sh'
import { NuSh } from '@meop/shire/sh/nu'
import { PowerSh } from '@meop/shire/sh/pwsh'
import { ZSh } from '@meop/shire/sh/zsh'

const REQ_URL_SH = ['req', 'url', 'sh']

const sysOsPlatToNativeShell: Record<string, string> = {
  linux: 'zsh',
  darwin: 'zsh',
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
  let execStr: (value: string) => string
  switch (target) {
    case 'nu':
      targetShell = new NuSh()
      execStr = NuSh.execStr
      break
    case 'pwsh':
      targetShell = new PowerSh()
      execStr = PowerSh.execStr
      break
    case 'zsh':
      targetShell = new ZSh()
      execStr = ZSh.execStr
      break
    default:
      return null
  }

  const script = targetShell
    .with(targetShell.varSetStr(REQ_URL_SH, url))
    .with(await targetShell.fileLoad(['get']))
    .build()
  return execStr(shell.toLiteral(script))
}

export async function redirectCommonShell(shell: Sh, context: Ctx): Promise<string | null> {
  return await redirectShell(shell, 'nu', context)
}

export async function redirectNativeShell(shell: Sh, context: Ctx): Promise<string | null> {
  return await redirectShell(shell, sysOsPlatToNativeShell[context.sys_os_plat ?? ''], context)
}

export function execNativeShell(shell: Sh, plat: string, cmd: string): string {
  return sysOsPlatToNativeShell[plat] === 'pwsh'
    ? PowerSh.execStr(shell.toLiteral(cmd))
    : ZSh.execStr(shell.toLiteral(cmd))
}
