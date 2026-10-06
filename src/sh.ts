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
  windows: 'pwsh',
}

// nu isn't guaranteed to be on PATH yet, so invoke wut's own pinned binary instead
function pinnedNuBinCmd(shell: Sh, sysOsPlat: string): string {
  const ext = sysOsPlat === 'windows' ? '.exe' : ''
  return shell.name === 'pwsh'
    ? `& "\${env:WUT_HOME}/vendor/nu${ext}"`
    : shell.name === 'zsh'
    ? `"\${WUT_HOME}/vendor/nu${ext}"`
    : `^($env.WUT_HOME | path join 'vendor' 'nu${ext}')`
}

export async function redirectShell(
  shell: Sh,
  target: string,
  context: Ctx,
  params: Array<string> = [],
): Promise<string | null> {
  if (shell.name === target) {
    return null
  }

  const url = [
    context.req_orig,
    context.req_path.replace(`/sh/${shell.name}`, `/sh/${target}`),
    context.req_srch,
    ...(params.length ? [context.req_srch ? '&' : '?', params.join('&')] : []),
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

// the pinned nu is where a command's client side runs: the only place a refreshed PATH has anything to serve
export function isPinnedNu(shell: Sh, context: Ctx): boolean {
  return shell.name === 'nu' && context.req_srch.includes(WUT_NU_PINNED_PARAM)
}

// nu alone needs it: its `try` catches a ctrl-c, where zsh and pwsh stop without being told to
export async function withSig(shell: Sh): Promise<Sh> {
  return shell.name === 'nu' ? shell.with(await shell.fileLoad(['sig'], import.meta.resolve, ['.'])) : shell
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
  const targetShell = getScriptFlavorShell(shellFlavor)
  const bin = shellFlavor === 'nu' ? pinnedNuBinCmd(shell, plat) : shellFlavor
  return `${bin} ${targetShell.execArgs(shell.toLiteral(cmd))}`
}

// a script is read by the shell it is written for, which is not always the platform's native one: script.yaml can
// gate a pwsh script onto linux
export function getScriptFlavorShell(shellFlavor: string): Sh {
  return shellFlavor === 'nu' ? new NuSh() : shellFlavor === 'pwsh' ? new PowerSh() : new ZSh()
}

// the switches reach a spawned script as env vars. zsh and nu read their switches from the environment already, but
// pwsh's op helpers and scripts read plain variables, which do not cross a process boundary — without this, a pwsh
// script ran its commands under --noop and asked its questions under --yes
const SWITCH_VARS = ['DEBUG', 'GRAYSCALE', 'NOOP', 'SUCCINCT', 'TRACE', 'YES']
const PWSH_SWITCH_IMPORT = [
  `foreach ($flag in ${SWITCH_VARS.map((v) => `'${v}'`).join(', ')}) {`,
  '  if (Test-Path "env:$flag") {',
  '    Set-Variable -Name $flag -Value (Get-Item "env:$flag").Value',
  '  }',
  '}',
].join('\n')

// a script file is spawned as its own process, so it needs its shell's op preamble loaded in directly
export async function getScriptFlavorOpPreamble(shellFlavor: string): Promise<string> {
  const shell = getScriptFlavorShell(shellFlavor)
  const preamble = await shell.fileLoad(['op'])
  if (shellFlavor === 'pwsh') {
    return `${PWSH_SWITCH_IMPORT}\n${preamble}`
  }
  return shellFlavor === 'nu' ? `${preamble}\n${await shell.fileLoad(['json'], import.meta.resolve, ['.'])}` : preamble
}
