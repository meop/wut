import type { Ctx } from '@meop/shire/ctx'

export function evaluateGate(
  gate: Record<string, Array<string>> | null | undefined,
  context: Ctx,
): boolean {
  if (!gate) {
    return true
  }
  for (const [key, values] of Object.entries(gate)) {
    const ctxVal = context[key as keyof Ctx] as string | undefined
    if (!ctxVal) {
      return false
    }
    const matches = key === 'sys_os_like' ? values.some((v) => ctxVal.includes(v)) : values.includes(ctxVal)
    if (!matches) {
      return false
    }
  }
  return true
}
