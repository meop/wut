import { assertEquals } from '@std/assert'

import { partsMatch, sameName, wordStartsWith } from './match.ts'

Deno.test('wordStartsWith - the term starts a word, and a separator is whatever is not a letter or a digit', () => {
  for (const name of ['golang', 'golang.go', 'foo/golang', '@scope/go-tool', 'pkg@go', 'x_go', '--cask go']) {
    assertEquals(wordStartsWith(name, 'go'), true, name)
  }
})

Deno.test('wordStartsWith - the middle or the end of a word is not its start', () => {
  for (const name of ['cargo', 'mongodb', 'ergo', 'lmstudio']) {
    assertEquals(wordStartsWith(name, 'go'), false, name)
    assertEquals(wordStartsWith(name, 'studio'), false, name)
  }
})

Deno.test('wordStartsWith - a leaf name is found behind its vendor, tap or scope', () => {
  assertEquals(wordStartsWith('glavsoft.tightvnc', 'tightvnc'), true)
  assertEquals(wordStartsWith('glavsoft.tightvnc', 'tight'), true)
  assertEquals(wordStartsWith('anomalyco/tap/opencode', 'opencode'), true)
  assertEquals(wordStartsWith('@anthropic-ai/claude-code', 'claude'), true)
  assertEquals(wordStartsWith('glavsoft.tightvnc', 'vnc'), false)
})

Deno.test('wordStartsWith - the term is taken as typed, case aside', () => {
  assertEquals(wordStartsWith('Glavsoft.TightVNC', 'tightvnc'), true)
  assertEquals(wordStartsWith('lm-studio', 'LM-Studio'), true)
  assertEquals(wordStartsWith('lm-studio', 'studio'), true)
  assertEquals(wordStartsWith('glavsoft.tightvnc', 'glavsoft.tight'), true)
  // its own separators are part of it, so two spellings of a name are two names
  assertEquals(wordStartsWith('lmstudio', 'lm-studio'), false)
  assertEquals(wordStartsWith('claude-code', 'claudecode'), false)
})

Deno.test('wordStartsWith - a digit is part of a word, and nothing matches an empty term', () => {
  assertEquals(wordStartsWith('7zip.7zip', '7z'), true)
  assertEquals(wordStartsWith('7zip', 'zip'), false)
  assertEquals(wordStartsWith('python3', 'python'), true)
  assertEquals(wordStartsWith('anything', ''), false)
})

Deno.test('sameName - the whole name, case aside', () => {
  assertEquals(sameName('nushell', 'NuShell'), true)
  assertEquals(sameName('nushell', 'nush'), false)
  assertEquals(sameName('lm-studio', 'lmstudio'), false)
  assertEquals(sameName('nushell', ''), false)
})

Deno.test('partsMatch - every term finds a level, in any order', () => {
  assertEquals(partsMatch(['qemu', 'glass'], ['glass', 'qemu'], 'exact'), true)
  assertEquals(partsMatch(['qemu', 'glass'], ['glass'], 'exact'), true)
  assertEquals(partsMatch(['qemu', 'glass'], ['gl'], 'exact'), false)
  assertEquals(partsMatch(['qemu', 'glass'], ['gl'], 'words'), true)
  assertEquals(partsMatch(['qemu', 'glass'], ['glass', 'shard'], 'exact'), false)
  assertEquals(partsMatch(['qemu', 'glass'], ['ass'], 'words'), false)
})
