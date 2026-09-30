import { assert } from '@std/assert'

export function req(path: string): Request {
  return new Request('http://x' + path)
}

// runs a nu script and returns its stdout, so client-side decisions can be asserted rather than only snapshotted.
// a run that reports a failure exits non-zero on purpose, so a test asserting that output can let it
export async function runNu(body: string, allowFailure = false): Promise<string | null> {
  const tmpFile = await Deno.makeTempFile({ suffix: '.nu' })
  try {
    await Deno.writeTextFile(tmpFile, body)
    let result: Deno.CommandOutput
    try {
      result = await new Deno.Command('nu', {
        args: ['--no-config-file', tmpFile],
        stdout: 'piped',
        stderr: 'piped',
      }).output()
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return null
      }
      throw e
    }
    if (result.code !== 0 && !allowFailure) {
      assert(false, `nu run failed:\n${new TextDecoder().decode(result.stderr)}`)
    }
    return new TextDecoder().decode(result.stdout).trim()
  } finally {
    await Deno.remove(tmpFile)
  }
}

export async function checkSyntax(shell: 'nu' | 'pwsh' | 'zsh', body: string): Promise<void> {
  if (shell === 'nu') {
    // --ide-check reads a file, not stdin, and exits 0 whatever it finds: its errors are diagnostics on stdout
    const tmpFile = await Deno.makeTempFile({ suffix: '.nu' })
    try {
      await Deno.writeTextFile(tmpFile, body)
      let result: Deno.CommandOutput
      try {
        result = await new Deno.Command('nu', {
          args: ['--no-config-file', '--ide-check', '100', tmpFile],
          stdout: 'piped',
          stderr: 'piped',
        }).output()
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return
        }
        throw e
      }
      const errors = new TextDecoder().decode(result.stdout).split('\n')
        .filter((line) => line.startsWith('{'))
        .map((line) => JSON.parse(line))
        .filter((d) => d.type === 'diagnostic' && d.severity === 'Error')
      if (result.code !== 0 || errors.length) {
        const detail = errors.map((d) => `${d.message} at ${body.slice(d.span.start, d.span.end + 40)}`)
        assert(false, `nu syntax check failed:\n${new TextDecoder().decode(result.stderr)}${detail.join('\n')}`)
      }
    } finally {
      await Deno.remove(tmpFile)
    }
  } else if (shell === 'pwsh') {
    const tmpFile = await Deno.makeTempFile({ suffix: '.ps1' })
    try {
      await Deno.writeTextFile(tmpFile, body)
      let result: Deno.CommandOutput
      try {
        result = await new Deno.Command('pwsh', {
          args: [
            '-NonInteractive',
            '-NoProfile',
            '-Command',
            `$errors = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${tmpFile}', [ref]$null, [ref]$errors); if ($errors) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }`,
          ],
          stdout: 'piped',
          stderr: 'piped',
        }).output()
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return
        }
        throw e
      }
      if (result.code !== 0) {
        const errText = new TextDecoder().decode(result.stderr)
        assert(false, `pwsh syntax check failed:\n${errText}`)
      }
    } finally {
      await Deno.remove(tmpFile)
    }
  } else if (shell === 'zsh') {
    const tmpFile = await Deno.makeTempFile({ suffix: '.zsh' })
    try {
      await Deno.writeTextFile(tmpFile, body)
      let result: Deno.CommandOutput
      try {
        result = await new Deno.Command('zsh', {
          args: ['-n', tmpFile],
          stdout: 'piped',
          stderr: 'piped',
        }).output()
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return
        }
        throw e
      }
      if (result.code !== 0) {
        const errText = new TextDecoder().decode(result.stderr)
        assert(false, `zsh syntax check failed:\n${errText}`)
      }
    } finally {
      await Deno.remove(tmpFile)
    }
  }
}
