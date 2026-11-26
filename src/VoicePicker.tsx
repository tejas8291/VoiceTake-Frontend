import { useEffect, useRef, useState } from 'react'
import { AudioLines, Check, Pause, Play, Search } from 'lucide-react'
import { api, languageNames, voiceName } from './api'
import type { Language, LanguageChoice, StudioStatus, Voice, VoiceCatalog } from './api'

type Props = {
  status?: StudioStatus
  language: LanguageChoice
  resolvedLanguage: Language
  hasScript: boolean
  onLanguageChange: (language: LanguageChoice) => void
  selected: Voice | undefined
  onSelect: (voice: Voice | undefined) => void
  disabled: boolean
  compact?: boolean
}

const filters = [
  ['all', 'All voices'],
  ['Feminine', 'Female-sounding'],
  ['Masculine', 'Male-sounding'],
  ['child', 'Childlike'],
  ['Neutral', 'Neutral'],
  ['older', 'Older adult'],
] as const

type VoiceFilter = (typeof filters)[number][0]

function matchesVoice(voice: Voice, filter: VoiceFilter) {
  if (filter === 'all') return true
  if (filter === 'child') return voice.age === 'Childlike' || voice.age === 'Child'
  if (filter === 'older') return voice.age === 'Older adult'
  return voice.sound === filter
}

export function VoicePicker({ status, language, resolvedLanguage, hasScript, onLanguageChange, selected, onSelect, disabled, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<VoiceFilter>('all')
  const [catalog, setCatalog] = useState<VoiceCatalog>()
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [previewId, setPreviewId] = useState<string>()
  const [previewError, setPreviewError] = useState('')
  const player = useRef<HTMLAudioElement>(null)
  const previewRequest = useRef(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const engine = status?.provider
  const privateName = status?.voice?.name
  const hasDefault = status?.has_default_voice

  useEffect(() => {
    if (!engine) return
    const controller = new AbortController()
    setLoading(true)
    api<VoiceCatalog>('/voices', { signal: controller.signal })
      .then(setCatalog)
      .catch(failure => {
        if (!controller.signal.aborted) setError(failure.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [engine])

  const accountVoices: Voice[] = []
  if (engine === 'elevenlabs' && privateName) {
    accountVoices.push({ id: '_private', name: privateName, age: '', sound: 'Private voice' })
  }
  if (engine === 'elevenlabs' && hasDefault) {
    accountVoices.push({ id: '_default', name: 'Configured voice', age: '', sound: 'Account default' })
  }
  const voices = [...accountVoices, ...(catalog?.voices || [])]
  if (selected && !selected.id.startsWith('_') && !voices.some(voice => voice.id === selected.id)) {
    voices.unshift(selected)
  }
  const naturalHindi = catalog?.voices.find(voice => voice.id === 'hindi-natural-male')
  const comparison = [naturalHindi, catalog?.voices.find(voice => voice.id === 'hindi-natural-male-psi')]
  const choice = voices.find(voice => voice.id === selected?.id) || accountVoices[0]
    || (resolvedLanguage === 'hi' ? naturalHindi : undefined)
    || voices.find(voice => voice.id === 'adult-neutral')
  const showHindiSwitch = naturalHindi && matchesVoice(naturalHindi, filter)
    && resolvedLanguage !== 'en' && choice?.id !== naturalHindi.id
  const visibleVoices = voices.filter(voice => matchesVoice(voice, filter))
  useEffect(() => {
    if (disabled) {
      previewRequest.current += 1
      player.current?.pause()
      setPreviewId(undefined)
    }
  }, [disabled])

  function stopPreview() {
    previewRequest.current += 1
    player.current?.pause()
    setPreviewId(undefined)
  }

  async function togglePreview(voice: Voice, compare = false) {
    const audio = player.current
    if (!audio || !voice.preview_url) return
    setPreviewError('')
    const key = compare ? 'comparison-' + voice.id : voice.id
    if (previewId === key) {
      stopPreview()
      return
    }
    const request = ++previewRequest.current
    audio.src = engine === 'demo'
      ? `${voice.preview_url}?language=${compare ? 'hi' : resolvedLanguage}`
      : voice.preview_url
    setPreviewId(key)
    try {
      await audio.play()
    } catch {
      if (previewRequest.current !== request) return
      setPreviewId(undefined)
      setPreviewError(`Couldn't play ${voiceName(voice)}. Try the preview again.`)
    }
  }

  async function load(query: string, append = false) {
    setLoading(true)
    setError('')
    if (!append) {
      stopPreview()
      setPreviewError('')
    }
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      if (append && catalog?.next_cursor) params.set('cursor', catalog.next_cursor)
      const result = await api<VoiceCatalog>('/voices?' + params)
      setCatalog(previous => ({
        voices: append ? [...new Map([...(previous?.voices || []), ...result.voices]
          .map(voice => [voice.id, voice])).values()] : result.voices,
        next_cursor: result.next_cursor,
      }))
      setActiveSearch(query)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load voices.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="voice-picker" aria-labelledby="voice-picker-title">
      <div className="section-title">
        <span className="icon-tile"><AudioLines size={19} aria-hidden="true" /></span>
        <div>
          <h3 id="voice-picker-title">Narrator voice</h3>
          <p>{engine === 'demo' ? 'Choose a voice type or select a card. Play previews a sample.' : 'Browse and preview voices from your account.'}</p>
        </div>
      </div>
      {compact && <div className="compact-narrator">
        <strong>{choice ? voiceName(choice) : 'Choose a voice'}</strong>
        <span>{language === 'auto' ? 'Auto · ' : ''}{languageNames[resolvedLanguage]}</span>
        <button type="button" aria-expanded={expanded} onClick={() => {
          stopPreview()
          setExpanded(value => !value)
        }}>{expanded ? 'Close voice selection' : 'Change voice'}</button>
      </div>}
      <div hidden={compact && !expanded}>
      {comparison.every(Boolean) && (
        <section className="voice-comparison" aria-label="Hindi male A/B comparison">
          <h4>Hindi male voice comparison</h4>
          <p>Both read the same paragraph in Hindi.</p>
          {comparison.map((voice, index) => voice && (
            <div className="voice-comparison-row" key={voice.id}>
              <strong>{voiceName(voice)}</strong>
              <button type="button" onClick={() => void togglePreview(voice, true)} disabled={disabled}
                aria-label={`${previewId === 'comparison-' + voice.id ? 'Pause' : 'Play'} ${index === 0 ? 'Omega' : 'Psi'} comparison`}>
                {previewId === 'comparison-' + voice.id ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                {previewId === 'comparison-' + voice.id ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={() => { onSelect(voice); setFilter('all') }}
                aria-label={`Use ${index === 0 ? 'Omega' : 'Psi'}`}
                disabled={disabled || resolvedLanguage === 'en' || choice?.id === voice.id}>
                {choice?.id === voice.id ? 'Selected' : 'Use voice'}
              </button>
            </div>
          ))}
          {resolvedLanguage === 'en' && <p>Choose Hindi or Hinglish to select either voice.</p>}
        </section>
      )}
      <div className="voice-settings">
        <label>Script language
          <select value={language} disabled={disabled} onChange={event => {
            stopPreview()
            setPreviewError('')
            onLanguageChange(event.target.value as LanguageChoice)
          }}>
            <option value="auto">Auto</option>
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </label>
        <label>Voice type
          <select value={filter} disabled={disabled || loading || (!catalog && !accountVoices.length)}
            onChange={event => {
              stopPreview()
              setPreviewError('')
              const next = event.target.value as VoiceFilter
              setFilter(next)
              if (next !== 'all' && (!choice || !matchesVoice(choice, next))) {
                const match = voices.find(voice => matchesVoice(voice, next)
                  && (!voice.languages || voice.languages.includes(resolvedLanguage)))
                if (match) onSelect(match)
              }
            }}>
            {filters.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
        </label>
      </div>
      {language === 'auto' && hasScript && (
        <p className="voice-help" role="status">{languageNames[resolvedLanguage]} detected</p>
      )}
      {choice && <p className="voice-help"><strong>Voice for next take:</strong> {voiceName(choice)}</p>}
      {showHindiSwitch && (
        <button type="button" disabled={disabled} onClick={() => onSelect(naturalHindi)}>
          Use {voiceName(naturalHindi)}
        </button>
      )}
      {engine === 'demo' && resolvedLanguage !== 'en' && (
        <p className="voice-help">{resolvedLanguage === 'hi'
          ? 'Write Hindi in देवनागरी for the offline voice.'
          : 'For offline Hinglish, write Hindi words in देवनागरी and English words in Latin script.'}</p>
      )}
      {engine === 'elevenlabs' && resolvedLanguage !== 'en' && (
        <p className="voice-help">Account previews may use a different language. New takes use your script language.</p>
      )}
      {choice && !visibleVoices.some(voice => voice.id === choice.id) && (
        <p className="voice-help">Selected voice: {voiceName(choice)}. Choose a card to change it.</p>
      )}
      {engine === 'elevenlabs' && (
        <form className="voice-search" onSubmit={event => {
          event.preventDefault()
          void load(search.trim())
        }}>
          <input aria-label="Search account voices" placeholder="Search name, age, or sound"
            maxLength={100} value={search} onChange={event => setSearch(event.target.value)} />
          <button disabled={disabled || loading} type="submit"><Search size={16} aria-hidden="true" /> Search</button>
        </form>
      )}
      <div className={engine === 'elevenlabs' ? 'voice-cards hosted-cards' : 'voice-cards'}
        role="radiogroup" aria-labelledby="voice-picker-title" aria-busy={loading}>
        {visibleVoices.map(voice => {
          const isSelected = choice?.id === voice.id
          const supported = !voice.languages || voice.languages.includes(resolvedLanguage)
          const suggested = Boolean(voice.languages?.includes(resolvedLanguage)) && resolvedLanguage === 'hi'
          const isPreviewing = previewId === voice.id
          const description = [voice.age, voice.sound,
            suggested ? 'Kokoro neural voice' : supported ? '' : 'Choose Hindi or Hinglish'].filter(Boolean).join(' · ')
          const labelId = `voice-name-${voice.id}`
          const descriptionId = `voice-details-${voice.id}`
          return (
            <div key={voice.id} className={isSelected ? 'voice-card is-selected' : 'voice-card'}>
              <label className="voice-option">
                <input type="radio" name="narrator-voice" value={voice.id} checked={isSelected}
                  onChange={() => onSelect(voice)} disabled={disabled || !supported}
                  aria-labelledby={labelId} aria-describedby={description ? descriptionId : undefined} />
                <span className="voice-text">
                  <strong id={labelId}>{voiceName(voice)}</strong>
                  {description && <span id={descriptionId}>{description}</span>}
                </span>
                {isSelected && <Check className="voice-check" size={14} aria-hidden="true" />}
              </label>
              {voice.preview_url && (
                <button type="button" className={isPreviewing ? 'voice-play is-playing' : 'voice-play'}
                  disabled={disabled || !supported} onClick={() => void togglePreview(voice)}
                  aria-label={isPreviewing ? `Pause preview of ${voiceName(voice)}` : `Preview ${voiceName(voice)}`}>
                  {isPreviewing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <audio ref={player} hidden preload="none" onEnded={() => setPreviewId(undefined)}
        onError={() => {
          if (previewId) {
            setPreviewError("This preview is unavailable. Try it again.")
            setPreviewId(undefined)
          }
        }} />
      {loading && <p role="status">Loading voices…</p>}
      {previewError && <p role="alert" className="voice-error">{previewError}</p>}
      {catalog?.next_cursor && (
        <button type="button" disabled={disabled || loading} onClick={() => void load(activeSearch, true)}>
          {loading ? 'Loading…' : 'Show more voices'}
        </button>
      )}
      {error && <p role="alert" className="voice-error">{error}</p>}
      {catalog && !loading && !visibleVoices.length && !error && <p>No voices match these filters.</p>}
      </div>
    </section>
  )
}
