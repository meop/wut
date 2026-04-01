import { assertEquals } from '@std/assert'
import { join } from '@std/path'

import { getFileContent, getFilePaths, isDirPath, isFilePath, isPath } from './fs.ts'

async function makeTempTree(): Promise<string> {
  const dir = await Deno.makeTempDir()
  await Deno.writeTextFile(join(dir, 'root.yaml'), 'root')
  await Deno.writeTextFile(join(dir, 'root.txt'), 'root')
  await Deno.mkdir(join(dir, 'pack'))
  await Deno.writeTextFile(join(dir, 'pack', 'group.yaml'), 'group')
  await Deno.mkdir(join(dir, 'pack', 'sub'))
  await Deno.writeTextFile(join(dir, 'pack', 'sub', 'nested.yaml'), 'nested')
  await Deno.mkdir(join(dir, 'other'))
  await Deno.writeTextFile(join(dir, 'other', 'thing.yaml'), 'thing')
  return dir
}

Deno.test('isPath - true for existing file and dir', async () => {
  const dir = await Deno.makeTempDir()
  const file = join(dir, 'f.txt')
  await Deno.writeTextFile(file, '')
  try {
    assertEquals(await isPath(dir), true)
    assertEquals(await isPath(file), true)
    assertEquals(await isPath(join(dir, 'missing')), false)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('isDirPath - true only for directories', async () => {
  const dir = await Deno.makeTempDir()
  const file = join(dir, 'f.txt')
  await Deno.writeTextFile(file, '')
  try {
    assertEquals(await isDirPath(dir), true)
    assertEquals(await isDirPath(file), false)
    assertEquals(await isDirPath(join(dir, 'missing')), false)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('isFilePath - true only for files', async () => {
  const dir = await Deno.makeTempDir()
  const file = join(dir, 'f.txt')
  await Deno.writeTextFile(file, '')
  try {
    assertEquals(await isFilePath(file), true)
    assertEquals(await isFilePath(dir), false)
    assertEquals(await isFilePath(join(dir, 'missing')), false)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFileContent - reads file, null for missing or dir', async () => {
  const dir = await Deno.makeTempDir()
  const file = join(dir, 'f.txt')
  await Deno.writeTextFile(file, 'hello')
  try {
    assertEquals(await getFileContent(file), 'hello')
    assertEquals(await getFileContent(join(dir, 'missing.txt')), null)
    assertEquals(await getFileContent(dir), null)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFilePaths - returns empty for missing or file path', async () => {
  const dir = await Deno.makeTempDir()
  const file = join(dir, 'f.txt')
  await Deno.writeTextFile(file, '')
  try {
    assertEquals(await getFilePaths(join(dir, 'missing')), [])
    assertEquals(await getFilePaths(file), [])
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFilePaths - no options returns all files recursively', async () => {
  const dir = await makeTempTree()
  try {
    const all = await getFilePaths(dir)
    assertEquals(all.length, 5)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFilePaths - extension filter', async () => {
  const dir = await makeTempTree()
  try {
    const yamls = await getFilePaths(dir, { extension: 'yaml' })
    assertEquals(yamls.length, 4)
    assertEquals(yamls.every((p) => p.endsWith('.yaml')), true)

    const txts = await getFilePaths(dir, { extension: 'txt' })
    assertEquals(txts.length, 1)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFilePaths - non-flexible filter matches first path segment', async () => {
  const dir = await makeTempTree()
  try {
    // 'pack' is the first segment — matches pack/group.yaml and pack/sub/nested.yaml
    const packFiles = await getFilePaths(dir, { filters: ['pack'], extension: 'yaml' })
    assertEquals(packFiles.length, 2)
    assertEquals(packFiles.every((p) => p.includes('pack')), true)

    // 'sub' is NOT the first segment anywhere — no matches
    const subFiles = await getFilePaths(dir, { filters: ['sub'], extension: 'yaml' })
    assertEquals(subFiles.length, 0)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFilePaths - non-flexible multi-filter matches consecutive segments from root', async () => {
  const dir = await makeTempTree()
  try {
    // segments[0]='pack', segments[1]='sub' — only pack/sub/nested.yaml
    const result = await getFilePaths(dir, { filters: ['pack', 'sub'], extension: 'yaml' })
    assertEquals(result.length, 1)
    assertEquals(result[0].endsWith('nested.yaml'), true)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})

Deno.test('getFilePaths - flexible filter matches segment at any depth', async () => {
  const dir = await makeTempTree()
  try {
    // 'sub' can appear at any segment depth — matches pack/sub/nested.yaml
    const subFiles = await getFilePaths(dir, { filters: ['sub'], extension: 'yaml', flexible: true })
    assertEquals(subFiles.length, 1)
    assertEquals(subFiles[0].endsWith('nested.yaml'), true)

    // 'other' at any depth — matches other/thing.yaml
    const otherFiles = await getFilePaths(dir, { filters: ['other'], extension: 'yaml', flexible: true })
    assertEquals(otherFiles.length, 1)
    assertEquals(otherFiles[0].endsWith('thing.yaml'), true)
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})
