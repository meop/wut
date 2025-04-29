import type { Ctx } from './ctx'
import { type Env, toEnvKey } from './env'
import { toCon, toFmt } from './serde'
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
    parts: Array<string>,
    shell: Sh,
    context: Ctx,
    environment?: Env,
  ): Promise<string>
}

type CmdPrintable = {
  id: string
  aliases?: string
  arguments?: Array<string>
  options?: Array<string>
  switches?: Array<string>
  commands?: string
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

  constructor(scopes: Array<string>) {
    this.scopes = scopes
  }

  getHelp(): CmdPrintable {
    const content: CmdPrintable = {
      id: `${[...this.scopes, this.name].join(' ')} | ${this.desc}`,
    }

    if (this.aliases.length) {
      content.aliases = this.aliases.join(', ')
    }

    if (this.arguments.length) {
      content.arguments = this.arguments.map(
        a => `${a.req ? '<' : '['}${a.name}${a.req ? '>' : ']'} | ${a.desc}`,
      )
    }

    if (this.options.length) {
      content.options = this.options.map(
        opt => `${opt.keys.join(', ')} | ${opt.desc}`,
      )
    }

    if (this.switches.length) {
      content.switches = this.switches.map(
        swt => `${swt.keys.join(', ')} | ${swt.desc}`,
      )
    }

    if (this.commands.length) {
      content.commands = this.commands.map(c => c.name).join(', ')
    }

    return content
  }

  async help(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    const body = await shell
      .withPrintInfo(async () => [
        toCon(this.getHelp(), toFmt(environment[toEnvKey('format')])),
      ])
      .build()

    if (environment[toEnvKey('log')]) {
      console.log(body)
    }

    return body
  }

  work(context: Ctx, environment: Env, shell: Sh): Promise<string> {
    return this.help(context, environment, shell)
  }

  process(
    parts: Array<string>,
    shell: Sh,
    context: Ctx,
    environment?: Env,
  ): Promise<string> {
    let _shell = shell
    const _context = context
    const _environment = environment ? environment : {}

    const setEnv = (key: string, value: string, append = false) => {
      const fullKey = toEnvKey(...[...this.scopes, this.name, key].slice(1))
      if (append && _environment[fullKey]) {
        _environment[fullKey] += ` ${value}`
      } else {
        _environment[fullKey] = value
      }
    }

    const processShEnv = (func: () => Promise<string>) => {
      for (const [key, value] of Object.entries(_environment)) {
        _shell = _shell.withEnvVarSet(
          async () => key,
          async () => value,
        )
      }

      if (_environment[toEnvKey('debug')]) {
        _shell = _shell.withPrint(async () => [
          toCon(
            {
              debug: {
                context: _context,
                environment: _environment,
              },
            },
            toFmt(_environment[toEnvKey('format')]),
          ),
        ])
      }

      if (_environment[toEnvKey('trace')]) {
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
            return processShEnv(() => this.help(_context, _environment, _shell))
          }
          setEnv(
            _option.keys.find(k => k.startsWith('--'))?.split('--')[1] ?? '',
            parts[partsIndex + 1],
          )
          partsIndex += 2
          continue
        }

        return processShEnv(() => this.help(_context, _environment, _shell))
      }

      if (this.commands.length) {
        const _command = this.commands.find(
          c => c.name === part || c.aliases.find(a => a === part),
        )
        if (_command) {
          return _command.process(
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

      return processShEnv(() => this.help(_context, _environment, _shell))
    }

    while (argumentIndex < this.arguments.length) {
      if (this.arguments[argumentIndex].req) {
        return processShEnv(() => this.help(_context, _environment, _shell))
      }
      argumentIndex += 1
    }

    return processShEnv(() => this.work(_context, _environment, _shell))
  }
}
