// the two questions a typed term can put to a name, the same in every command (docs/COMMANDS.md):
// an acting op asks whether this is the name, and find asks whether it starts one of the name's words

const WORD_CHAR = /[a-z0-9]/

// an acting op's question: add, rem, sync and the rest take a name as typed, never part of one
export function sameName(name: string, term: string): boolean {
  return term.length > 0 && name.toLowerCase() === term.toLowerCase()
}

// find's question: what was typed starts a word of the name, a word being what sits between anything that is not a
// letter or a digit. `go` finds `golang.go` and `foo/golang`, and never `cargo`. the term is taken as typed, its own
// separators included, so `lm-studio` finds `lm-studio` and `studio` does not find `lmstudio`
export function wordStartsWith(name: string, term: string): boolean {
  const n = name.toLowerCase()
  const t = term.toLowerCase()
  if (!t.length) {
    return false
  }
  for (let at = n.indexOf(t); at !== -1; at = n.indexOf(t, at + 1)) {
    if (at === 0 || !WORD_CHAR.test(n[at - 1])) {
      return true
    }
  }
  return false
}

export type Match = 'exact' | 'words'

export function nameMatches(name: string, term: string, how: Match): boolean {
  return how === 'exact' ? sameName(name, term) : wordStartsWith(name, term)
}

// a path under a config dir is a name per level, and every term has to find one of them: the folders above an entry
// are groups of what they hold, so naming one reaches all of it, and the order terms are typed in does not matter
export function partsMatch(parts: Array<string>, terms: Array<string>, how: Match): boolean {
  return terms.every((t) => parts.some((p) => nameMatches(p, t, how)))
}
