import { assertEquals, assertThrows } from '@std/assert'
import { join } from '@std/path'

import { getPlatAclPermCmds, toRelParts, toUnixPath, toWinntPath } from './path.ts'

Deno.test('toRelParts - splits relative path into parts', () => {
  const dir = join('/tmp', 'mydir')
  const file = join(dir, 'sub', 'file.yaml')
  assertEquals(toRelParts(dir, file), ['sub', 'file'])
})

Deno.test('toRelParts - strips extension by default', () => {
  const dir = '/tmp/mydir'
  const file = join(dir, 'thing.yaml')
  assertEquals(toRelParts(dir, file), ['thing'])
})

Deno.test('toRelParts - keeps extension when stripExt=false', () => {
  const dir = '/tmp/mydir'
  const file = join(dir, 'thing.yaml')
  assertEquals(toRelParts(dir, file, false), ['thing.yaml'])
})

Deno.test('toRelParts - single file in root', () => {
  const dir = '/tmp/mydir'
  const file = join(dir, 'root.txt')
  assertEquals(toRelParts(dir, file), ['root'])
})

Deno.test('toUnixPath - replaces backslashes with forward slashes', () => {
  assertEquals(toUnixPath('C:\\Users\\test\\file.txt'), 'C:/Users/test/file.txt')
})

Deno.test('toUnixPath - no change for already-unix paths', () => {
  assertEquals(toUnixPath('/home/user/file.txt'), '/home/user/file.txt')
})

Deno.test('toWinntPath - replaces forward slashes with backslashes', () => {
  assertEquals(toWinntPath('C:/Users/test/file.txt'), 'C:\\Users\\test\\file.txt')
})

Deno.test('toWinntPath - no change for already-winnt paths', () => {
  assertEquals(toWinntPath('C:\\Users\\test\\file.txt'), 'C:\\Users\\test\\file.txt')
})

Deno.test('getPlatAclPermCmds - darwin returns chmod', () => {
  const cmds = getPlatAclPermCmds('darwin', '/path/to/dir', { user: { read: true, write: true } }, 'testuser')
  assertEquals(cmds.length, 1)
  assertEquals(cmds[0].startsWith('chmod'), true)
  assertEquals(cmds[0].includes('/path/to/dir'), true)
})

Deno.test('getPlatAclPermCmds - linux returns chmod', () => {
  const cmds = getPlatAclPermCmds('linux', '/opt/app', { user: { read: true }, group: { read: true } }, 'appuser')
  assertEquals(cmds.length, 1)
  assertEquals(cmds[0].startsWith('chmod'), true)
})

Deno.test('getPlatAclPermCmds - winnt returns icacls reset + grant', () => {
  const cmds = getPlatAclPermCmds(
    'winnt',
    'C:\\Users\\test\\.ssh',
    { user: { read: true, write: true }, group: { read: true } },
    'testuser',
  )
  assertEquals(cmds.length, 2)
  assertEquals(cmds[0].includes('icacls'), true)
  assertEquals(cmds[0].includes('/t /reset'), true)
  assertEquals(cmds[1].includes('icacls'), true)
  assertEquals(cmds[1].includes('/inheritance:r'), true)
  assertEquals(cmds[1].includes('testuser'), true)
})

Deno.test('getPlatAclPermCmds - throws for unsupported platform', () => {
  assertThrows(() => getPlatAclPermCmds('freebsd', '/path', { user: { read: true } }, 'user'))
})
