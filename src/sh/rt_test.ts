import type { Sh } from '@meop/shire/sh'
import { NuSh } from '@meop/shire/sh/nu'
import { PowerSh } from '@meop/shire/sh/pwsh'
import { ZSh } from '@meop/shire/sh/zsh'
import { assertEquals } from '@std/assert'

import { getScriptFlavorOpPreamble } from '../sh.ts'
import { VERSIONS } from '../vers.ts'

const NU_VERS = `${VERSIONS.nu.major}.${VERSIONS.nu.minor}.${VERSIONS.nu.patch}`

const SHELLS: Array<{ sh: Sh; bin: string; args: Array<string>; ext: string }> = [
  { sh: new NuSh(), bin: 'nu', args: ['--no-config-file'], ext: 'nu' },
  { sh: new PowerSh(), bin: 'pwsh', args: ['-NoProfile', '-NonInteractive', '-File'], ext: 'ps1' },
  { sh: new ZSh(), bin: 'zsh', args: ['-f'], ext: 'zsh' },
]

// the runtime as the server sends it, minus the request: each shell's op helpers, the pinned version, the machine,
// then rt itself. a curl that always fails is first on PATH, so a sync never reaches the network
async function runRuntime(
  shell: (typeof SHELLS)[number],
  opts: { nuBody?: string; verbose: boolean },
): Promise<{ code: number; stdout: string; stderr: string; wutHome: string } | null> {
  const wutHome = await Deno.makeTempDir()
  const stubs = await Deno.makeTempDir()
  const script = await Deno.makeTempFile({ suffix: `.${shell.ext}` })
  try {
    await Deno.writeTextFile(`${stubs}/curl`, '#!/bin/sh\necho "curl: no network in tests" >&2\nexit 22\n')
    await Deno.chmod(`${stubs}/curl`, 0o755)
    if (opts.nuBody != null) {
      await Deno.mkdir(`${wutHome}/vendor`)
      await Deno.writeTextFile(`${wutHome}/vendor/nu`, `#!/bin/sh\n${opts.nuBody}\n`)
      await Deno.chmod(`${wutHome}/vendor/nu`, 0o755)
    }
    const sh = shell.sh
    await Deno.writeTextFile(
      script,
      [
        await getScriptFlavorOpPreamble(sh.name),
        sh.varSet(['nu', 'vers', 'major'], String(VERSIONS.nu.major)),
        sh.varSet(['nu', 'vers', 'minor'], String(VERSIONS.nu.minor)),
        sh.varSet(['nu', 'vers', 'patch'], String(VERSIONS.nu.patch)),
        await Deno.readTextFile(new URL(`./${sh.name}/rt.${shell.ext}`, import.meta.url)),
      ].join('\n'),
    )
    let result: Deno.CommandOutput
    try {
      result = await new Deno.Command(shell.bin, {
        args: [...shell.args, script],
        env: {
          PATH: `${stubs}:${Deno.env.get('PATH')}`,
          WUT_HOME: wutHome,
          SYS_OS_PLAT: Deno.build.os,
          SYS_CPU_ARCH: Deno.build.arch,
          GRAYSCALE: '1',
          ...(opts.verbose ? { VERBOSE: '1' } : {}),
        },
        stdout: 'piped',
        stderr: 'piped',
      }).output()
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return null
      }
      throw e
    }
    const decode = (b: Uint8Array) => new TextDecoder().decode(b).trim()
    return { code: result.code, stdout: decode(result.stdout), stderr: decode(result.stderr), wutHome }
  } finally {
    await Deno.remove(stubs, { recursive: true })
    await Deno.remove(script)
  }
}

async function exists(path: string): Promise<boolean> {
  return await Deno.stat(path).then(() => true).catch(() => false)
}

for (const shell of SHELLS) {
  // the stubs are sh scripts, and windows has no runtime to sync here but its own
  if (Deno.build.os === 'windows') {
    break
  }

  Deno.test(`rt / ${shell.sh.name} / a current nu is said only under -v`, async () => {
    const loud = await runRuntime(shell, { nuBody: `echo ${NU_VERS}`, verbose: true })
    if (loud == null) {
      return
    }
    try {
      assertEquals(loud.code, 0)
      assertEquals(loud.stdout, '')
      assertEquals(loud.stderr, `nu ${NU_VERS}: current at ${loud.wutHome}/vendor/nu`)
    } finally {
      await Deno.remove(loud.wutHome, { recursive: true })
    }

    const quiet = (await runRuntime(shell, { nuBody: `echo ${NU_VERS}`, verbose: false }))!
    try {
      assertEquals(quiet.code, 0)
      assertEquals(quiet.stdout, '')
      assertEquals(quiet.stderr, '')
    } finally {
      await Deno.remove(quiet.wutHome, { recursive: true })
    }
  })

  // a failed fetch is an error whatever the flags, and -v says each step that led to it
  Deno.test(`rt / ${shell.sh.name} / a sync says each step under -v, and its failure always`, async () => {
    const loud = await runRuntime(shell, { nuBody: 'echo 0.0.1', verbose: true })
    if (loud == null) {
      return
    }
    try {
      assertEquals(loud.code, 1)
      const said = `${loud.stdout}\n${loud.stderr}`
      assertEquals(said.includes(`nu ${NU_VERS}: ${loud.wutHome}/vendor/nu has 0.0.1, syncing`), true, said)
      assertEquals(
        said.includes(`fetching https://github.com/nushell/nushell/releases/download/${NU_VERS}/nu-${NU_VERS}-`),
        true,
        said,
      )
      assertEquals(said.includes(`failed to download nu ${NU_VERS}`), true, said)
      // the lock is given back, so the next run can sync rather than wait out a lock nobody holds
      assertEquals(await exists(`${loud.wutHome}/vendor/.nu`), false)
    } finally {
      await Deno.remove(loud.wutHome, { recursive: true })
    }

    const quiet = (await runRuntime(shell, { verbose: false }))!
    try {
      assertEquals(quiet.code, 1)
      const said = `${quiet.stdout}\n${quiet.stderr}`
      assertEquals(said.includes('syncing'), false, said)
      assertEquals(said.includes('fetching'), false, said)
      assertEquals(said.includes(`failed to download nu ${NU_VERS}`), true, said)
    } finally {
      await Deno.remove(quiet.wutHome, { recursive: true })
    }
  })
}
