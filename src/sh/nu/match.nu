# find's rule, as src/match.ts has it: what was typed starts a word of the name, a word being what sits between anything
# that is not a letter or a digit. a pattern as well as a check, so a filter built into a command line can carry it
def wutWordPattern [term: string] {
  $"\(?i\)\(^|[^a-z0-9]\)($term | str replace --all --regex '[\\.+*?()\[\]{}|^$]' '\$0')"
}

def wutWordMatch [name: string, term: string] {
  ($term | is-not-empty) and ($name =~ (wutWordPattern $term))
}
