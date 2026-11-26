import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const output = mkdtempSync(join(tmpdir(), 'voicetake-script-tests-'))
try {
  execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'),
    'src/storySegments.ts', 'src/api.ts', '--target', 'ES2022', '--module', 'commonjs',
    '--skipLibCheck', '--outDir', output], { stdio: 'inherit' })
  writeFileSync(join(output, 'package.json'), '{"type":"commonjs"}')
  const { splitStory, scriptIssues, characterCount } = createRequire(import.meta.url)(join(output, 'storySegments.js'))
  const normalizeSpaces = text => text.replace(/\s+/gu, ' ').trim()
  const paragraph = 'आरव कमरे की तरफ बढ़े। '.repeat(35).trim()
  const split = splitStory(paragraph, 'slow')
  assert.ok(split.length > 1)
  assert.ok(split.every(line => characterCount(line.text) <= 500 && line.speed === 'slow'))
  assert.equal(normalizeSpaces(split.map(line => line.text).join(' ')), normalizeSpaces(paragraph))
  assert.deepEqual(scriptIssues(split), [])

  const dialogue = splitStory(`Narrator: पहले आवाज़ आई।\nDialogue: ${paragraph}\nवह चुप हो गया।`, 'normal')
  assert.equal(dialogue[0].kind, 'narration')
  assert.ok(dialogue.slice(1, -1).every(line => line.kind === 'dialogue'))
  assert.equal(dialogue.at(-1).text, 'वह चुप हो गया।')
  assert.deepEqual(splitStory('आरव बोला “तुम कौन हो?” फिर दरवाज़ा बंद हुआ।', 'normal').map(line => line.kind),
    ['narration', 'dialogue', 'narration'])

  const oversized = splitStory('क'.repeat(501), 'normal')
  assert.equal(oversized[0].text, 'क'.repeat(501))
  assert.ok(scriptIssues(oversized).some(issue => issue.includes('Line 1 has 501')))
  assert.deepEqual(scriptIssues([{ text: 'क'.repeat(500), style: 'auto' }]), [])
  assert.deepEqual(scriptIssues(Array.from({ length: 4 }, () => ({ text: 'क'.repeat(400), style: 'auto' }))), [])
  assert.ok(scriptIssues(splitStory('शब्द '.repeat(500), 'normal')).some(issue => issue.includes('over the 1600')))
  assert.ok(scriptIssues(splitStory(Array(25).fill('एक लाइन।').join('\n'), 'normal')).some(issue => issue.includes('over the 24')))
  assert.ok(scriptIssues([{ text: ' ', style: 'auto' }]).some(issue => issue.includes('empty')))
  assert.equal(characterCount('😀'), 1)
  assert.equal(characterCount('काँपने'), Array.from('काँपने').length)
  console.log('Script import checks passed: boundaries, content order, dialogue roles, Unicode counts and limits.')
} finally {
  rmSync(output, { recursive: true, force: true })
}
