import { assert } from '@std/assert'

export function req(path: string): Request {
  return new Request('http://x' + path)
}

export async function checkSyntax(shell: 'nu' | 'pwsh' | 'zsh', body: string): Promise<void> {
  if (shell === 'nu') {
    const cmd = new Deno.Command('nu', {
      args: ['--no-config-file', '--ide-check', '100'],
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped',
    })
    let proc: Deno.ChildProcess
    try {
      proc = cmd.spawn()
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) return
      throw e
    }
    const writer = proc.stdin.getWriter()
    await writer.write(new TextEncoder().encode(body))
    await writer.close()
    const { code, stderr } = await proc.output()
    if (code !== 0) {
      const errText = new TextDecoder().decode(stderr)
      assert(false, `nu syntax check failed:\n${errText}`)
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
        if (e instanceof Deno.errors.NotFound) return
        throw e
      }
      if (result.code !== 0) {
        const errText = new TextDecoder().decode(result.stderr)
        assert(false, `zsh syntax check failed:\n${errText}`)
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
        if (e instanceof Deno.errors.NotFound) return
        throw e
      }
      if (result.code !== 0) {
        const errText = new TextDecoder().decode(result.stderr)
        assert(false, `pwsh syntax check failed:\n${errText}`)
      }
    } finally {
      await Deno.remove(tmpFile)
    }
  }
}
