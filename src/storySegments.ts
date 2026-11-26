import { voiceName } from './api'
import type { Scene, Speaker, Speed } from './api'

export const scriptLimits = { characters: 1600, lines: 24, lineCharacters: 500 } as const
// Match Python's Unicode code-point counts rather than UTF-16 code units.
export const characterCount = (text: string) => Array.from(text).length

export function scriptIssues(scenes: Scene[]): string[] {
  const issues: string[] = []
  const count = scenes.reduce((sum, scene) => sum + characterCount(scene.text.trim()), 0)
  if (count > scriptLimits.characters) issues.push(`${count} characters: ${count - scriptLimits.characters} over the ${scriptLimits.characters}-character limit. Split this story into separate narrations; your pasted text has been kept.`)
  if (scenes.length > scriptLimits.lines) issues.push(`${scenes.length} lines: ${scenes.length - scriptLimits.lines} over the ${scriptLimits.lines}-line limit.`)
  if (!scenes.length) issues.push('Add a script before importing.')
  for (const [index, scene] of scenes.entries()) {
    const size = characterCount(scene.text.trim())
    if (!size) issues.push(`Line ${index + 1} is empty. Add text before generating.`)
    if (size > scriptLimits.lineCharacters) issues.push(`Line ${index + 1} has ${size} characters. Use up to ${scriptLimits.lineCharacters} per line; add a sentence or word break to split it.`)
  }
  return issues
}

function splitLongLine(scene: Scene): Scene[] {
  const result: Scene[] = []
  let remaining = scene.text
  while (characterCount(remaining) > scriptLimits.lineCharacters) {
    const prefix = Array.from(remaining).slice(0, scriptLimits.lineCharacters + 1).join('')
    // Break only at whitespace so Hindi combining marks and words stay intact.
    const breaks = [...prefix.matchAll(/\s+/gu)].filter(match => match.index! > 0
      && characterCount(prefix.slice(0, match.index)) <= scriptLimits.lineCharacters)
    if (!breaks.length) break // Keep an oversized word intact and report it.
    const sentence = breaks.filter(match => /[।.!?]["”’']?$/u.test(prefix.slice(0, match.index)))
    const boundary = (sentence.at(-1) || breaks.at(-1))!
    result.push({ ...scene, text: remaining.slice(0, boundary.index).trim() })
    remaining = remaining.slice(boundary.index! + boundary[0].length).trim()
  }
  if (remaining) result.push({ ...scene, text: remaining })
  return result
}

export function splitStory(script: string, speed: Speed): Scene[] {
  const scenes: Scene[] = []
  for (const line of script.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    const labelled = /^(संवाद|dialogue|narrator|वाचक)\s*:\s*(.*)$/iu.exec(line)
    if (labelled) {
      const text = labelled[2].trim().replace(/^["“]|["”]$/g, '')
      if (text) scenes.push({ text, speed, style: 'auto',
        kind: /^(संवाद|dialogue)$/iu.test(labelled[1]) ? 'dialogue' : 'narration' })
      continue
    }

    // Keep the exact order of narration and quoted dialogue on a mixed line.
    const quotes = /“([^”]+)”|"([^"]+)"/gu
    let end = 0
    const append = (text: string, kind: 'narration' | 'dialogue') => {
      text = text.trim()
      if (!text) return
      if (/^[।.!?,;:…]+$/u.test(text) && scenes.length) {
        const previous = scenes[scenes.length - 1]
        if (!/[।.!?…]$/u.test(previous.text)) previous.text += text
        return
      }
      scenes.push({ text, speed, style: 'auto', kind })
    }
    for (const match of line.matchAll(quotes)) {
      append(line.slice(end, match.index), 'narration')
      append(match[1] || match[2], 'dialogue')
      end = match.index + match[0].length
    }
    append(line.slice(end), 'narration')
  }
  return scenes.flatMap(splitLongLine)
}

export const speakerOptions: readonly [Speaker, string][] = [
  ['narrator', 'Narrator (selected voice)'],
  ['hindi-natural-female', voiceName({ id: 'hindi-natural-female', name: 'Character · Hindi Female' })],
  ['hindi-natural-male', voiceName({ id: 'hindi-natural-male', name: 'Character · Hindi Male (Omega)' })],
  ['hindi-natural-male-psi', voiceName({ id: 'hindi-natural-male-psi', name: 'Character · Hindi Male (Psi)' })],
]
