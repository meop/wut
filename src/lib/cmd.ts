import { getCtx, type Ctx } from './ctx'
import type { Sh } from './sh'
import { Pwsh } from './sh/pwsh'
import { Zsh } from './sh/zsh'

export interface Cmd {
  name: string
  desc: string

  aliases: Array<string>
  arguments: Array<{ name: string; desc: string; req?: boolean }>
  options: Array<{ keys: Array<string>; desc: string }>
  switches: Array<{ keys: Array<string>; desc: string }>

  commands: Array<Cmd>
  roots: Array<string>

  process(
    url: URL,
    usp: URLSearchParams,
    paths: Array<string>,
    context?: Ctx,
    environment?: { [key: string]: string },
    shell?: Sh,
  ): Promise<string>
}

export class CmdBase implements Cmd {
  name = ''
  desc = ''

  aliases: Array<string> = []
  arguments: Array<{ name: string; desc: string; req?: boolean }> = []
  options: Array<{ keys: Array<string>; desc: string }> = []
  switches: Array<{ keys: Array<string>; desc: string }> = []

  commands: Array<Cmd> = []
  roots: Array<string> = []

  help(): Array<string> {
    const contents: Array<string> = []

    contents.push(`${[...this.roots, this.name].join(' ')} | ${this.desc}`)
    if (this.aliases.length) {
      contents.push('aliases:')
      contents.push(`  ${this.aliases.join(', ')}`)
    }

    if (this.arguments.length) {
      contents.push('arguments:')
      for (const arg of this.arguments) {
        contents.push(
          `  ${arg.req ? '<' : '['}${arg.name}${arg.req ? '>' : ']'} | ${arg.desc}`,
        )
      }
    }

    if (this.options.length) {
      contents.push('options:')
      for (const opt of this.options) {
        contents.push(`  ${opt.keys.join(', ')} | ${opt.desc}`)
      }
    }

    if (this.switches.length) {
      contents.push('switches:')
      for (const swt of this.switches) {
        contents.push(`  ${swt.keys.join(', ')} | ${swt.desc}`)
      }
    }

    if (this.commands.length) {
      contents.push('commands:')
      contents.push(`  ${this.commands.map(s => s.name).join(', ')}`)
    }

    return contents
  }

  async work(shell: Sh): Promise<string> {
    return await shell.withLogInfo(this.help(), { singleQuote: true }).build()
  }

  async process(
    url: URL,
    usp: URLSearchParams,
    paths: Array<string>,
    context?: Ctx,
    environment?: { [key: string]: string },
    shell?: Sh,
  ): Promise<string> {
    const baseName = this.roots.length ? this.roots[0] : this.name

    const _context = context ? context : getCtx(usp)

    const _environment = environment ? environment : {}

    let _shell = shell
      ? shell
      : (_context.sys.sh === 'pwsh' ? new Pwsh() : new Zsh())
          .withSetVar(
            [baseName, 'URL'].join('_').toUpperCase(),
            url.toString(),
            {
              singleQuote: true,
            },
          )
          .withLoadFilePath('sys', 'env')
          .withLoadFilePath('sys', 'log')

    if (!_context.sys.cpu.arch) {
      return await _shell.withLoadFilePath('cli').build()
    }

    const setEnv = (key: string, value: string, append = false) => {
      const fullKey = [...this.roots, this.name, key].join('_').toUpperCase()
      if (append && _environment[fullKey]) {
        _environment[fullKey] += ` ${value}`
      } else {
        _environment[fullKey] = value
      }
    }

    const setShEnv = () => {
      for (const [key, value] of Object.entries(_environment)) {
        _shell = _shell.withSetVar(key, value, {
          singleQuote: true,
        })
      }

      const traceKey = [...this.roots, this.name, 'TRACE']
        .join('_')
        .toUpperCase()
      if (_environment[traceKey]) {
        _shell = _shell.withLoadFilePath('sys', 'trace')
      }

      const debugKey = [...this.roots, this.name, 'DEBUG']
        .join('_')
        .toUpperCase()
      if (_environment[debugKey]) {
        _shell = _shell.withLogSucc(['url:'])
        _shell = _shell.withLog([url.toString()], { singleQuote: true })
        _shell = _shell.withLogSucc(['context:'])
        _shell = _shell.withLog([JSON.stringify(_context, null, 2)], {
          singleQuote: true,
        })
        _shell = _shell.withLogSucc(['environment:'])
        _shell = _shell.withLog([JSON.stringify(_environment, null, 2)], {
          singleQuote: true,
        })
      }
    }

    let pathsIndex = 0
    let argumentIndex = 0

    while (pathsIndex < paths.length) {
      const path = paths[pathsIndex]

      if (path.startsWith('-')) {
        const _switch = this.switches.find(s => s.keys.includes(path))
        if (_switch) {
          setEnv(
            _switch.keys.find(k => k.startsWith('--'))?.split('--')[1] ?? '',
            '1',
          )
          pathsIndex += 1
          continue
        }
        const _option = this.options.find(o => o.keys.includes(path))
        if (_option && pathsIndex + 1 < paths.length) {
          if (paths[pathsIndex + 1].startsWith('-')) {
            setShEnv()
            return await _shell
              .withLogInfo(this.help(), { singleQuote: true })
              .build()
          }
          setEnv(
            _option.keys.find(k => k.startsWith('--'))?.split('--')[1] ?? '',
            paths[pathsIndex + 1],
          )
          pathsIndex += 2
          continue
        }
        setShEnv()
        return await _shell
          .withLogInfo(this.help(), { singleQuote: true })
          .build()
      }

      if (this.commands.length) {
        const _command = this.commands.find(s => s.name === path)
        if (_command) {
          setShEnv()
          return _command.process(
            url,
            usp,
            paths.slice(pathsIndex + 1),
            _context,
            _environment,
            _shell,
          )
        }
      }

      if (this.arguments.length) {
        const lastArg = argumentIndex + 1 === this.arguments.length
        setEnv(this.arguments[argumentIndex].name, path, lastArg)
        if (!lastArg) {
          argumentIndex += 1
        }
        pathsIndex += 1
        continue
      }

      setShEnv()
      return await _shell
        .withLogInfo(this.help(), { singleQuote: true })
        .build()
    }

    setShEnv()
    return await this.work(_shell)
  }
}
