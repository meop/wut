import { assertEquals, assertThrows } from '@std/assert'
import { join } from '@std/path'

import { getPlatAclPermCmds, toRelParts, toUnixPath, toWindowsPath } from './path.ts'

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

Deno.test('toWindowsPath - replaces forward slashes with backslashes', () => {
  assertEquals(toWindowsPath('C:/Users/test/file.txt'), 'C:\\Users\\test\\file.txt')
})

Deno.test('toWindowsPath - no change for already-windows paths', () => {
  assertEquals(toWindowsPath('C:\\Users\\test\\file.txt'), 'C:\\Users\\test\\file.txt')
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

Deno.test('getPlatAclPermCmds - windows returns icacls reset + grant', () => {
  const cmds = getPlatAclPermCmds(
    'windows',
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

// sshd runs as SYSTEM, so a file granted only to its user (authorized_keys) must still be readable by SYSTEM
Deno.test('getPlatAclPermCmds - windows always grants SYSTEM read', () => {
  const [, userOnly] = getPlatAclPermCmds('windows', 'C:\\Users\\test\\.ssh\\authorized_keys', {
    user: { read: true, write: true },
  }, 'testuser')
  assertEquals(userOnly.endsWith('/grant "testuser:(gr,gw)" "SYSTEM:(gr)"'), true)
  const [, withOther] = getPlatAclPermCmds(
    'windows',
    'C:\\x',
    { user: { read: true }, other: { write: true } },
    'testuser',
  )
  assertEquals(withOther.endsWith('"SYSTEM:(gr,gw)"'), true)
})

Deno.test('getPlatAclPermCmds - throws for unsupported platform', () => {
  assertThrows(() => getPlatAclPermCmds('freebsd', '/path', { user: { read: true } }, 'user'))
})
