import { getCpuArch, getOsPlat } from './os'

export type Ctx = {
  req_orig: string
  req_path: string
  req_srch: string
  sys_cpu_arch?: string
  sys_cpu_ven_id?: string
  sys_host?: string
  sys_os_id?: string
  sys_os_plat?: string
  sys_os_ver_id?: string
  sys_os_ver_code?: string
  sys_user?: string
}

export function getSp(usp: URLSearchParams, key: string) {
  return usp.has(key) ? (usp.get(key) ?? '') : undefined
}

export function getCtx(req: Request): Ctx {
  const url = new URL(req.url.endsWith('/') ? req.url.slice(0, -1) : req.url)
  const usp = new URLSearchParams(url.search)

  const spSysCpuArch = getSp(usp, 'sysCpuArch')
  const spSysCpuVenId = getSp(usp, 'sysCpuVenId')
  const spSysOsId = getSp(usp, 'sysOsId')
  const spSysOsPlat = getSp(usp, 'sysOsPlat')
  const spSysOsVerId = getSp(usp, 'sysOsVerId')
  const spSysOsVerCode = getSp(usp, 'sysOsVerCode')
  const spSysHost = getSp(usp, 'sysHost')
  const spSysUser = getSp(usp, 'sysUser')

  const sysCpuArch = spSysCpuArch ? getCpuArch(spSysCpuArch) : undefined
  const sysCpuVenId = spSysCpuVenId
  const sysOsId = spSysOsId
  const sysOsPlat = spSysOsPlat ? getOsPlat(spSysOsPlat) : undefined
  const sysOsVerId = spSysOsVerId
  const sysOsVerCode = spSysOsVerCode
  const sysHost = spSysHost
  const sysUser = spSysUser

  return {
    req_orig: url.origin,
    req_path: url.pathname,
    req_srch: url.search,
    sys_cpu_arch: sysCpuArch,
    sys_cpu_ven_id: sysCpuVenId,
    sys_host: sysHost,
    sys_os_id: sysOsId,
    sys_os_plat: sysOsPlat,
    sys_os_ver_id: sysOsVerId,
    sys_os_ver_code: sysOsVerCode,
    sys_user: sysUser,
  }
}
