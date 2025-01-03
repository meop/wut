export async function sleep(timeoutMs: number = 1 * 1000) {
  return await new Promise((r) => setTimeout(r, timeoutMs))
}
