import type { Cli } from './cli.ts'
import type { Ctx } from './ctx.ts'
import { type Env, toEnvKey } from './env.ts'
import { toCon, toFmt } from './serde.ts'

export interface Cmd {
  name: string
  description: string

  aliases: Array<string>
  arguments: Array<{ name: string; description: string; required?: boolean }>
  options: Array<{ keys: Array<string>; description: string }>
  switches: Array<{ keys: Array<string>; description: string }>

  commands: Array<Cmd>
  scopes: Array<string>

  process(
    parts: Array<string>,
    client: Cli,
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
  description = ''

  aliases: Array<string> = []
  arguments: Array<{ name: string; description: string; required?: boolean }> =
    []
  options: Array<{ keys: Array<string>; description: string }> = []
  switches: Array<{ keys: Array<string>; description: string }> = []

  commands: Array<Cmd> = []
  scopes: Array<string> = []

  constructor(scopes: Array<string>) {
    this.scopes = scopes
  }

  getHelp(): CmdPrintable {
    const content: CmdPrintable = {
      id: `${[...this.scopes, this.name].join(' ')} | ${this.description}`,
    }

    if (this.aliases.length) {
      content.aliases = this.aliases.join(', ')
    }

    if (this.arguments.length) {
      content.arguments = this.arguments.map(
        (a) =>
          `${a.required ? '<' : '['}${a.name}${
            a.required ? '>' : ']'
          } | ${a.description}`,
      )
    }

    if (this.options.length) {
      this.options.sort((a, b) => a.keys[0].localeCompare(b.keys[0]))
      content.options = this.options.map(
        (opt) => `${opt.keys.join(', ')} | ${opt.description}`,
      )
    }

    this.switches.push({
      keys: ['-h', '--help'],
      description: 'print help',
    })
    if (this.switches.length) {
      this.switches.sort((a, b) => a.keys[0].localeCompare(b.keys[0]))
      content.switches = this.switches.map(
        (swt) => `${swt.keys.join(', ')} | ${swt.description}`,
      )
    }

    if (this.commands.length) {
      content.commands = this.commands.map((c) => c.name).join(', ')
    }

    return content
  }

  async help(client: Cli, _context: Ctx, environment: Env): Promise<string> {
    const body = await client
      .with(
        client.printInfo(
          Promise.resolve(
            toCon(this.getHelp(), toFmt(environment[toEnvKey('format')])),
          ),
        ),
      )
      .build()

    if (environment[toEnvKey('log')]) {
      console.log(body)
    }

    return body
  }

  work(client: Cli, context: Ctx, environment: Env): Promise<string> {
    return this.help(client, context, environment)
  }

  process(
    parts: Array<string>,
    client: Cli,
    context: Ctx,
    environment?: Env,
  ): Promise<string> {
    let _client = client
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

    const loadCliEnv = (func: () => Promise<string>) => {
      for (const [key, value] of Object.entries(_environment)) {
        _client = _client.with(
          _client.varSet(
            Promise.resolve(key),
            Promise.resolve(_client.toInner(value)),
          ),
        )
      }

      if (_environment[toEnvKey('debug')]) {
        _client = _client.with(
          _client.print(
            Promise.resolve(
              toCon(
                {
                  debug: {
                    context: _context,
                    environment: _environment,
                  },
                },
                toFmt(_environment[toEnvKey('format')]),
              ),
            ),
          ),
        )
      }

      if (_environment[toEnvKey('trace')]) {
        _client = _client.with(Promise.resolve(_client.trace()))
      }

      return func()
    }

    let partsIndex = 0
    let argumentIndex = 0

    while (partsIndex < parts.length) {
      const part = parts[partsIndex]

      if (part.startsWith('-') && part !== '--') {
        if (part === '-h' || part === '--help') {
          return loadCliEnv(() => this.help(_client, _context, _environment))
        }
        const _switch = this.switches.find((s) => s.keys.includes(part))
        if (_switch) {
          setEnv(
            _switch.keys.find((k) => k.startsWith('--'))?.split('--')[1] ?? '',
            '1',
          )
          partsIndex += 1
          continue
        }
        const _option = this.options.find((o) => o.keys.includes(part))
        if (_option && partsIndex + 1 < parts.length) {
          if (parts[partsIndex + 1].startsWith('-')) {
            return loadCliEnv(() => this.help(_client, _context, _environment))
          }
          setEnv(
            _option.keys.find((k) => k.startsWith('--'))?.split('--')[1] ?? '',
            parts[partsIndex + 1],
          )
          partsIndex += 2
          continue
        }
      }

      if (this.commands.length) {
        const _command = this.commands.find(
          (c) => c.name === part || c.aliases.find((a) => a === part),
        )
        if (_command) {
          return _command.process(
            parts.slice(partsIndex + 1),
            _client,
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

      return loadCliEnv(() => this.help(_client, _context, _environment))
    }

    while (argumentIndex < this.arguments.length) {
      if (this.arguments[argumentIndex].required) {
        return loadCliEnv(() => this.help(_client, _context, _environment))
      }
      argumentIndex += 1
    }

    return loadCliEnv(() => this.work(_client, _context, _environment))
  }
}
