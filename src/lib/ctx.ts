import { getCpuArch, getOsPlat } from './os'

export type Ctx = {
  sys?: {
    cpu?: {
      arch?: string
    }
    host?: string
    os?: {
      plat?: string
      dist?: string
      ver?: {
        id?: string
        code?: string
      }
    }
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
  const spSysOsVerId = getSp(usp, 'sysOsVerId')
  const spSysOsVerCode = getSp(usp, 'sysOsVerCode')
  const spSysHost = getSp(usp, 'sysHost')
  const spSysUser = getSp(usp, 'sysUser')

  const sysCpuArch = spSysCpuArch ? getCpuArch(spSysCpuArch) : undefined
  const sysOsPlat = spSysOsPlat ? getOsPlat(spSysOsPlat) : undefined
  const sysOsDist = spSysOsDist
  const sysOsVerId = spSysOsVerId
  const sysOsVerCode = spSysOsVerCode
  const sysHost = spSysHost
  const sysUser = spSysUser

  return {
    sys: {
      cpu: {
        arch: sysCpuArch,
      },
      host: sysHost,
      os: {
        plat: sysOsPlat,
        dist: sysOsDist,
        ver: {
          id: sysOsVerId,
          code: sysOsVerCode,
        },
      },
      user: sysUser,
    },
  }
}
