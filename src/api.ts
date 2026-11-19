export const styles = ['auto', 'conversational', 'curious', 'suspenseful', 'energetic', 'warm', 'storytelling', 'horror', 'sad', 'happy', 'angry', 'warning', 'reveal'] as const

export type Language = 'en' | 'hi' | 'hinglish'
export type LanguageChoice = Language | 'auto'

export const languageNames: Record<Language, string> = {
  en: 'English', hi: 'Hindi', hinglish: 'Hinglish',
}

export function detectLanguage(text: string): Language {
  const hasDevanagari = /(?=\p{Letter})\p{Script=Devanagari}/u.test(text)
  if (!hasDevanagari) return 'en'
  return /(?=\p{Letter})\p{Script=Latin}/u.test(text) ? 'hinglish' : 'hi'
}

export type Speed = 'slow' | 'normal' | 'fast'
export type Speaker = 'narrator' | 'hindi-natural-female' | 'hindi-natural-male' | 'hindi-natural-male-psi'
export type Scene = {
  text: string; style: typeof styles[number]; pause_before_ms?: number; pause_after_ms?: number; speed?: Speed; speaker?: Speaker
  gain_db?: number; kind?: 'narration' | 'dialogue'
}
export type Take = {
  id: string
  status: 'queued' | 'running' | 'ready' | 'failed'
  scenes: Scene[]
  language?: Language
  voice_name?: string
  segment_gap_ms?: number | null
  duration?: number
  error?: string
}
export type StudioStatus = {
  provider: 'demo' | 'elevenlabs'
  has_default_voice: boolean
  has_local_characters: boolean
  local_character_voices?: Speaker[]
  voice: { name: string; requires_verification: boolean } | null
}
export type Pronunciations = Record<string, string>

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, options)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = typeof payload.detail === 'string' ? payload.detail : payload.detail?.[0]?.msg
    throw new Error(message || 'Unable to complete the request. Check the API terminal.')
  }
  return response.json()
}

export function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export function asset(take: Take, file: 'narration.wav' | 'narration.mp3' | 'captions.srt', download = false) {
  return `/api/takes/${take.id}/files/${file}${download ? '?download=true' : ''}`
}

export async function waitForTake(initial: Take) {
  let take = initial
  while (take.status === 'queued' || take.status === 'running') {
    await new Promise(resolve => window.setTimeout(resolve, 750))
    take = await api<Take>('/takes/' + take.id)
  }
  if (take.status === 'failed') throw new Error(take.error || 'Generation failed.')
  return take
}

export type Voice = {
  languages?: Language[]
  id: string
  name: string
  age: string
  sound: string
  description?: string
  preview_url?: string | null
}

export type VoiceCatalog = { voices: Voice[]; next_cursor: string | null }

const hindiVoiceNames: Record<string, string> = {
  'hindi-natural-male': 'Omega · Hindi Natural Male',
  'hindi-natural-male-psi': 'Psi · Hindi Natural Male',
  'hindi-natural-female': 'Alpha · Hindi Natural Female',
  'Hindi · Natural Male': 'Omega · Hindi Natural Male',
  'Hindi · Natural Male (Psi)': 'Psi · Hindi Natural Male',
  'Hindi · Natural Female': 'Alpha · Hindi Natural Female',
}

export function voiceName(voice: Pick<Voice, 'id' | 'name'> | string): string {
  return typeof voice === 'string'
    ? hindiVoiceNames[voice] || voice
    : hindiVoiceNames[voice.id] || voice.name
}
