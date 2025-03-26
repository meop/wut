import type { Ctx } from './ctx'
import type { Env } from './env'
import { type Fmt, consStr } from './seri'
import type { Sh } from './sh'

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
    parts: Array<string>,
    shell: Sh,
    context: Ctx,
    environment?: Env,
  ): Promise<string>
}

export class CmdBase {
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

    return shell.withPrintInfo(...contents).build()
  }

  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return this.help(shell)
  }

  process(
    url: URL,
    usp: URLSearchParams,
    parts: Array<string>,
    shell: Sh,
    context: Ctx,
    environment?: Env,
  ): Promise<string> {
    let _shell = shell
    const _context = context
    const _environment = environment ? environment : {}

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
        _shell = _shell.withSetVar(key, value)
      }

      if (_environment['debug'.toUpperCase()]) {
        const formatEnv = _environment['format'.toUpperCase()]
        const format = formatEnv ? (formatEnv as Fmt) : undefined

        _shell = _shell.withPrintSucc('url:')
        _shell = _shell.withPrint(consStr(url.toString(), format))
        _shell = _shell.withPrintSucc('context:')
        _shell = _shell.withPrint(consStr(_context, format))
        _shell = _shell.withPrintSucc('environment:')
        _shell = _shell.withPrint(consStr(_environment, format))
      }

      if (_environment['trace'.toUpperCase()]) {
        _shell = _shell.withTrace()
      }

      return func()
    }

    let partsIndex = 0
    let argumentIndex = 0

    while (partsIndex < parts.length) {
      const part = parts[partsIndex]

      if (part.startsWith('-') && part !== '--') {
        const _switch = this.switches.find(s => s.keys.includes(part))
        if (_switch) {
          setEnv(
            _switch.keys.find(k => k.startsWith('--'))?.split('--')[1] ?? '',
            '1',
          )
          partsIndex += 1
          continue
        }
        const _option = this.options.find(o => o.keys.includes(part))
        if (_option && partsIndex + 1 < parts.length) {
          if (parts[partsIndex + 1].startsWith('-')) {
            return processShEnv(() => this.help(_shell))
          }
          setEnv(
            _option.keys.find(k => k.startsWith('--'))?.split('--')[1] ?? '',
            parts[partsIndex + 1],
          )
          partsIndex += 2
          continue
        }

        return processShEnv(() => this.help(_shell))
      }

      if (this.commands.length) {
        const _command = this.commands.find(
          c => c.name === part || c.aliases.find(a => a === part),
        )
        if (_command) {
          return _command.process(
            url,
            usp,
            parts.slice(partsIndex + 1),
            _shell,
            _context,
            _environment,
          )
        }
      }

      if (this.arguments.length) {
        const allArgsFound = argumentIndex === this.arguments.length
        setEnv(
          this.arguments[allArgsFound ? argumentIndex - 1 : argumentIndex].name,
          part,
          allArgsFound,
        )
        if (!allArgsFound) {
          argumentIndex += 1
        }
        partsIndex += 1
        continue
      }

      return processShEnv(() => this.help(_shell))
    }

    while (argumentIndex < this.arguments.length) {
      if (this.arguments[argumentIndex].req) {
        return processShEnv(() => this.help(_shell))
      }
      argumentIndex += 1
    }

    return processShEnv(() => this.work(_context, _environment, _shell))
  }
}
