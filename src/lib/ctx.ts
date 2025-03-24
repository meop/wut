import { getCpuArch, getOsPlat, getSysSh } from './os'

export type Ctx = {
  sys: {
    cpu: {
      arch?: string
    }
    os: {
      plat?: string
      dist?: string
      ver?: string
    }
    sh?: string
    user?: string
  }
}

export function getSp(usp: URLSearchParams, key: string) {
  return usp.has(key) ? (usp.get(key) ?? '') : undefined
}

export function getCtx(usp: URLSearchParams): Ctx {
  const spSysCpuArch = getSp(usp, 'sysCpuArch')
  const spSysOsPlat = getSp(usp, 'sysOsPlat')
  const spSysOsDist = getSp(usp, 'sysOsDist')
  const spSysOsVer = getSp(usp, 'sysOsVer')
  const spSysSh = getSp(usp, 'sysSh')
  const spSysUser = getSp(usp, 'sysUser')

  const sysCpuArch = spSysCpuArch ? getCpuArch(spSysCpuArch) : undefined
  const sysOsPlat = spSysOsPlat ? getOsPlat(spSysOsPlat) : undefined
  const sysOsDist = spSysOsDist
  const sysOsVer = spSysOsVer
  const sysSh = spSysSh ? getSysSh(spSysSh) : undefined
  const sysUser = spSysUser

  return {
    sys: {
      cpu: {
        arch: sysCpuArch,
      },
      os: {
        plat: sysOsPlat,
        dist: sysOsDist,
        ver: sysOsVer,
      },
      sh: sysSh,
      user: sysUser,
    },
  }
}
