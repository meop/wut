import { Command, Option } from 'commander'

export function addCommonOptions(cmd: Command) {
  cmd.addOption(new Option('-d, --dry-run', 'dry run'))
  cmd.addOption(new Option('-v, --verbose', 'verbose'))
}

export function buildCmd(name: string, description: string, command?: Command) {
  return (command || new Command())
    .name(name)
    .description(description)
    .helpCommand(false)
}
