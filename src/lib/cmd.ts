import { getCtx, type Ctx } from './ctx'
import type { Env } from './env'
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
  scopes: Array<string>

  process(
    url: URL,
    usp: URLSearchParams,
    paths: Array<string>,
    context?: Ctx,
    environment?: Env,
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
  scopes: Array<string> = []

  help(shell: Sh): Promise<string> {
    const contents: Array<string> = []

    contents.push(`${[...this.scopes].join(' ')} | ${this.desc}`)
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

    return shell.withLogInfo(contents, { singleQuote: true }).build()
  }

  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return this.help(shell)
  }

  process(
    url: URL,
    usp: URLSearchParams,
    paths: Array<string>,
    context?: Ctx,
    environment?: Env,
    shell?: Sh,
  ): Promise<string> {
    const _context = context ? context : getCtx(usp)

    const _environment = environment ? environment : {}

    let _shell = shell
      ? shell
      : (_context.sys.sh === 'pwsh' ? new Pwsh() : new Zsh())
          .withSetVar('url'.toUpperCase(), url.toString(), {
            singleQuote: true,
          })
          .withLoadFilePath('sys', 'env')
          .withLoadFilePath('sys', 'log')

    if (!_context.sys.cpu.arch) {
      return _shell.withLoadFilePath('cli').build()
    }

    const setEnv = (key: string, value: string, append = false) => {
      const fullKey = [...this.scopes.slice(1), key].join('_').toUpperCase()
      if (append && _environment[fullKey]) {
        _environment[fullKey] += ` ${value}`
      } else {
        _environment[fullKey] = value
      }
    }

    const processShEnv = (func: () => Promise<string>) => {
      for (const [key, value] of Object.entries(_environment)) {
        _shell = _shell.withSetVar(key, value, {
          singleQuote: true,
        })
      }

      if (_environment['trace'.toUpperCase()]) {
        _shell = _shell.withLoadFilePath('sys', 'trace')
      }

      if (_environment['debug'.toUpperCase()]) {
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

      return func()
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
            return processShEnv(() => this.help(_shell))
          }
          setEnv(
            _option.keys.find(k => k.startsWith('--'))?.split('--')[1] ?? '',
            paths[pathsIndex + 1],
          )
          pathsIndex += 2
          continue
        }

        return processShEnv(() => this.help(_shell))
      }

      if (this.commands.length) {
        const _command = this.commands.find(
          c => c.name === path || c.aliases.find(a => a === path),
        )
        if (_command) {
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
        const lastArg = argumentIndex === this.arguments.length - 1
        setEnv(this.arguments[argumentIndex].name, path, lastArg)
        if (!lastArg) {
          argumentIndex += 1
        }
        pathsIndex += 1
        continue
      }

      return processShEnv(() => this.help(_shell))
    }

    while (argumentIndex < this.arguments.length - 1) {
      if (this.arguments[argumentIndex].req) {
        return processShEnv(() => this.help(_shell))
      }
      argumentIndex += 1
    }

    return processShEnv(() => this.work(_context, _environment, _shell))
  }
}
