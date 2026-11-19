import { voiceName } from './api'
import type { Scene, Speaker, Speed } from './api'

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
  return scenes
}

export const speakerOptions: readonly [Speaker, string][] = [
  ['narrator', 'Narrator (selected voice)'],
  ['hindi-natural-female', voiceName({ id: 'hindi-natural-female', name: 'Character · Hindi Female' })],
  ['hindi-natural-male', voiceName({ id: 'hindi-natural-male', name: 'Character · Hindi Male (Omega)' })],
  ['hindi-natural-male-psi', voiceName({ id: 'hindi-natural-male-psi', name: 'Character · Hindi Male (Psi)' })],
]
