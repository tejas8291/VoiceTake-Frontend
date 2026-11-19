import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AudioLines, Captions, ClipboardPaste, Download, FileText, Headphones,
  Plus, Play, RotateCcw, Trash2 } from 'lucide-react'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/manrope/wght.css'
import { Help, Home, SiteFrame, useSite } from './Site'
import { ProjectLibrary } from './ProjectLibrary'
import { loadProjects, newProject, saveProjects } from './projects'
import type { Project } from './projects'
import { VoiceProfile } from './VoiceProfile'
import { speakerOptions, splitStory } from './storySegments'
import { VoicePicker } from './VoicePicker'
import { PauseField } from './PauseField'
import { RenderActivity } from './RenderActivity'
import { api, asset, detectLanguage, json, languageNames, styles, waitForTake } from './api'
import type { Pronunciations, Scene, Speed, Speaker, StudioStatus, Take, Voice } from './api'
import './styles.css'

const sample: Scene[] = [
  { text: 'I almost deleted this video.', style: 'auto' },
  { text: 'Then I noticed something moving in the background…', style: 'auto' },
  { text: 'It was there the whole time. Would you have spotted it?', style: 'auto' },
]

const deliveryPresets = [
  ['auto', 'Follow the script'],
  ['conversational', 'Explain something'],
  ['storytelling', 'Natural Storytelling'],
  ['suspenseful', 'Suspense'],
  ['warning', 'Warning'],
  ['reveal', 'Mystery Reveal'],
  ['warm', 'Speak warmly'],
  ['curious', 'Ask or explore'],
  ['energetic', 'Make an announcement'],
  ['horror', 'Tell a horror story'],
  ['sad', 'Tell a sad story'],
  ['happy', 'Share good news'],
  ['angry', 'Sound angry'],
] as const

function setDelivery(scene: Scene, style: Scene['style']): Scene {
  const suggested = style === 'warning' ? 400
    : style === 'reveal' && /[?？][”"’']?$/u.test(scene.text.trim()) ? 700 : undefined
  return { ...scene, style, pause_before_ms: scene.pause_before_ms ?? suggested }
}

const speedOptions = [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']] as const
function TakePlayer({ take, comparison = false }: { take: Take; comparison?: boolean }) {
  return (
    <section className="player">
      <div className="row">
        <h3>{comparison ? 'Previous take' : 'Current take'}</h3>
        <span>{take.language ? `${languageNames[take.language]} · ` : ''}{take.duration?.toFixed(1)} s</span>
      </div>
      {take.voice_name && <p className="voice-help">Rendered with {take.voice_name}
        {take.scenes.some(scene => scene.speaker && scene.speaker !== 'narrator') ? ' and character voices' : ''}</p>}
      <audio key={take.id} controls preload="metadata" src={asset(take, 'narration.wav')} />
      {!comparison && (
        <div className="actions">
          <a className="export-link" href={asset(take, 'narration.wav', true)}><Download size={16} aria-hidden="true" /> Download WAV</a>
          <a className="export-link" href={asset(take, 'narration.mp3', true)}><Download size={16} aria-hidden="true" /> Download MP3</a>
          <a className="export-link" href={asset(take, 'captions.srt', true)}><Captions size={16} aria-hidden="true" /> Download SRT</a>
        </div>
      )}
    </section>
  )
}

function Studio() {
  const { path, navigate } = useSite()
  const [projects, setProjects] = useState(() => loadProjects(sample))
  const project = projects.items.find(item => item.id === projects.activeId)!
  const { language, voice: narratorVoice, scenes, keepTiming, segmentGapMs } = project
  const [status, setStatus] = useState<StudioStatus>()
  const [aliases, setAliases] = useState<Pronunciations>({})
  const [sharedDictionary, setSharedDictionary] = useState(false)
  const dictionaryUrl = `/pronunciations?project_id=${project.id}&shared=${sharedDictionary}`
  const [takeCache, setTakeCache] = useState<Record<string, Take>>({})
  const [viewTakeId, setViewTakeId] = useState<string>()
  const takeId = viewTakeId || project.takeIds.at(-1)
  const compareId = project.takeIds[project.takeIds.indexOf(takeId || '') - 1]
  const take = takeId ? takeCache[takeId] : undefined
  const previous = compareId ? takeCache[compareId] : undefined
  const [storageError, setStorageError] = useState('')
  const [busy, setBusy] = useState('')
  const renderingNarration = busy === 'Rendering narration'
  const [error, setError] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pastedScript, setPastedScript] = useState('')
  const [segmentPreview, setSegmentPreview] = useState<{ index: number; url: string }>()
  useEffect(() => () => {
    if (segmentPreview) URL.revokeObjectURL(segmentPreview.url)
  }, [segmentPreview])
  const [activeLine, setActiveLine] = useState(0)
  useEffect(() => setActiveLine(0), [project.id])
  const [scriptPreset, setScriptPreset] = useState<Scene['style']>('auto')
  const scriptSpeed = scenes[0]?.speed ?? 'normal'
  const characters = scenes.reduce((sum, scene) => sum + scene.text.trim().length, 0)
  const invalid = characters > 1600 || scenes.some(scene => !scene.text.trim())
  const script = scenes.map(scene => scene.text).join(' ')
  const detectedLanguage = detectLanguage(script)
  const resolvedLanguage = language === 'auto' ? detectedLanguage : language
  const selectedVoiceSupportsLanguage = !narratorVoice?.languages || narratorVoice.languages.includes(resolvedLanguage)
  const hasCharacterLines = scenes.some(scene => scene.speaker && scene.speaker !== 'narrator')
  const canUseCharacters = Boolean(status?.has_local_characters && resolvedLanguage !== 'en')
  const compatiblePresets = (projects.voicePresets || []).filter(voice =>
    !voice.languages || voice.languages.includes(resolvedLanguage))
  const narratorSaved = projects.voicePresets?.some(voice => voice.id === narratorVoice?.id)
  const canGenerate = status?.provider === 'demo' || Boolean(narratorVoice || status?.voice || status?.has_default_voice)

  function updateProject(patch: Partial<Project>) {
    setProjects(current => ({
      ...current,
      items: current.items.map(item => item.id === project.id
        ? { ...item, ...patch, importDraft: false, updatedAt: new Date().toISOString() }
        : item),
    }))
  }

  function setScenes(next: Scene[] | ((values: Scene[]) => Scene[])) {
    setSegmentPreview(undefined)
    updateProject({ scenes: typeof next === 'function' ? next(scenes) : next })
  }

  function setNarratorVoice(voice: Voice | undefined) {
    updateProject({ voice })
  }

  function openProject(id: string) {
    if (busy) return
    if (id !== project.id) {
      setProjects(current => ({ ...current, activeId: id }))
      resetProjectView()
    }
    navigate('/studio')
  }

  function resetProjectView() {
    setSegmentPreview(undefined)
    setAliases({})
    setViewTakeId(undefined)
    setError('')
    setPasteOpen(false)
    setPastedScript('')
    setScriptPreset('auto')
  }

  function createProject(name: string) {
    if (busy) return
    const next = newProject(name)
    setProjects(current => ({ ...current, activeId: next.id, items: [...current.items, next] }))
    resetProjectView()
    navigate('/studio')
  }

  useEffect(() => {
    try {
      saveProjects(projects)
      setStorageError('')
    } catch {
      setStorageError('This browser could not save the draft. Keep this tab open or copy your script.')
    }
  }, [projects])

  useEffect(() => {
    api<StudioStatus>('/status').then(setStatus).catch(error => setError(error.message))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api<Pronunciations>(dictionaryUrl, { signal: controller.signal })
      .then(setAliases).catch(error => {
        if (!controller.signal.aborted) setError(error.message)
      })
    return () => controller.abort()
  }, [dictionaryUrl])

  useEffect(() => {
    const controller = new AbortController()
    for (const id of new Set([takeId, compareId])) {
      if (!id) continue
      api<Take>('/takes/' + id, { signal: controller.signal }).then(saved => {
        if (controller.signal.aborted || saved.status !== 'ready') return
        setTakeCache(current => ({ ...current, [id]: saved }))
        if (id === takeId) {
          setProjects(current => {
            const draft = current.items.find(item => item.id === project.id)
            if (!draft?.importDraft) return current
            return {
              ...current,
              items: current.items.map(item => item.id === project.id
                ? { ...item, scenes: saved.scenes, language: saved.language || 'en', importDraft: false }
                : item),
            }
          })
        }
      }).catch(error => {
        if (!controller.signal.aborted) setError(error.message)
      })
    }
    return () => controller.abort()
  }, [project.id, takeId, compareId])

  async function perform(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError('')
    try {
      await action()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.')
    } finally {
      setBusy('')
    }
  }

  function updateScene(index: number, update: Partial<Scene>) {
    setScenes(values => values.map((scene, position) => position === index ? { ...scene, ...update } : scene))
  }

  function previewLine(index: number) {
    void perform('Rendering segment preview', async () => {
      const response = await fetch('/api/segments/preview', json('POST', {
        scenes, index, voice_id: narratorVoice?.id, language,
        project_id: project.id, segment_gap_ms: segmentGapMs,
      }))
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}))
        throw new Error(typeof failure.detail === 'string' ? failure.detail : 'Could not preview this segment.')
      }
      setSegmentPreview({ index, url: URL.createObjectURL(await response.blob()) })
    })
  }

  function generate(index?: number) {
    const line = index === undefined ? undefined : scenes[index]
    const isRetake = index !== undefined && Boolean(take)
    void perform(isRetake ? 'Rendering line' : 'Rendering narration', async () => {
      const initial = isRetake
        ? await api<Take>(`/takes/${take?.id}/retakes`, json('POST', {
          index, scene: line, keep_timing: keepTiming,
        }))
        : await api<Take>('/takes', json('POST', { scenes, voice_id: narratorVoice?.id, language, project_id: project.id, segment_gap_ms: segmentGapMs }))
      const result = await waitForTake(initial)
      setTakeCache(current => ({ ...current, [result.id]: result }))
      updateProject({ takeIds: [...project.takeIds, result.id] })
      setViewTakeId(undefined)
    })
  }

  const gapMatches = (take?.segment_gap_ms ?? undefined) === segmentGapMs
  const sceneLayoutMatches = take?.scenes.length === scenes.length
  const changedLines = scenes.map((scene, index) =>
    scene.text.trim() !== take?.scenes[index]?.text
    || scene.style !== take?.scenes[index]?.style
    || (scene.pause_before_ms ?? 0) !== (take?.scenes[index]?.pause_before_ms ?? 0)
    || (scene.pause_after_ms ?? 0) !== (take?.scenes[index]?.pause_after_ms ?? 0)
    || (scene.speed ?? 'normal') !== (take?.scenes[index]?.speed ?? 'normal')
    || (scene.speaker ?? 'narrator') !== (take?.scenes[index]?.speaker ?? 'narrator')
    || (scene.gain_db ?? 0) !== (take?.scenes[index]?.gain_db ?? 0))

  function importScript() {
    const segments = splitStory(pastedScript, scriptSpeed)
    if (!segments.length || segments.length > 24 || segments.some(scene => scene.text.length > 500)
      || segments.reduce((size, scene) => size + scene.text.length, 0) > 1600) {
      setError('Use 1–24 segments, up to 500 characters per segment and 1600 total.')
      return
    }
    setScenes(segments)
    setPasteOpen(false)
    setPastedScript('')
    setError('')
  }

  function createVoice(data: FormData) {
    void perform('Creating voice', async () => {
      const updated = await api<StudioStatus>('/voice', { method: 'POST', body: data })
      setStatus(updated)
      if (updated.voice) {
        setNarratorVoice({ id: '_private', name: updated.voice.name, age: '', sound: 'Private voice' })
      }
    })
  }

  function deleteVoice() {
    if (!window.confirm('Delete this voice clone from ElevenLabs? Existing takes stay available.')) return
    void perform('Deleting voice', async () => {
      setStatus(await api('/voice', { method: 'DELETE' }))
      setProjects(current => ({
        ...current,
        items: current.items.map(item => item.voice?.id === '_private' ? { ...item, voice: undefined } : item),
      }))
    })
  }

  const voicePicker = <VoicePicker status={status} language={language}
    resolvedLanguage={resolvedLanguage} hasScript={Boolean(script.trim())} onLanguageChange={value => updateProject({ language: value })}
    selected={narratorVoice} onSelect={setNarratorVoice} disabled={Boolean(busy)} />

  return (
    <SiteFrame path={path} navigate={navigate}>
        {path === '/' && <Home navigate={navigate} />}
        {path === '/help' && <Help navigate={navigate} />}
        {path === '/projects' && <ProjectLibrary projects={projects.items} disabled={Boolean(busy)}
          onOpen={openProject} onCreate={createProject} />}
        {(path === '/studio' || path === '/voices') && (
          <div className="page-heading">
            <div>
              <h1 id="page-title" tabIndex={-1}>{path === '/studio' ? 'Narration studio' : 'Voice library'}</h1>
              <p>{path === '/studio' ? 'Write, direct, and export your voiceover.' : 'Listen to narrators or add your own voice.'}</p>
            </div>
            <span className="engine"><i aria-hidden="true" />{status?.provider === 'elevenlabs' ? 'ElevenLabs connected' : 'Offline demo'}</span>
          </div>
        )}
        {storageError && <p role="alert" className="notice error">{storageError}</p>}
        {((busy && !renderingNarration) || error) && (
          <div className={error ? 'notice error' : 'notice'} role={error ? 'alert' : 'status'}>
            {busy.startsWith('Rendering') && <RenderActivity />}{error || busy + '…'}
          </div>
        )}
        {path === '/voices' && (
          <div className="library-layout">
            <VoiceProfile status={status} disabled={Boolean(busy)} navigate={navigate}
              createVoice={createVoice} deleteVoice={deleteVoice} />
            {voicePicker}
          </div>
        )}
        {path === '/studio' && <>
          {script.trim() && (
            (language === 'hi' && detectedLanguage === 'en') ||
            (language === 'en' && detectedLanguage !== 'en')
          ) && (
            <div className="notice" role="status">
              {language === 'hi'
                ? 'Hindi is selected, but this script has no Devanagari. Choose English for English text, or type Hindi in Devanagari for clearer offline narration.'
                : 'English is selected, but this script contains Devanagari. Choose Auto, Hindi, or Hinglish before generating.'}
            </div>
          )}
          <div className="project-toolbar">
            <label>Project name
              <input key={project.id} aria-label="Current project name" defaultValue={project.name} maxLength={80}
                disabled={Boolean(busy)} onBlur={event => {
                  const name = event.target.value.trim()
                  if (name && name !== project.name) updateProject({ name })
                  else event.target.value = project.name
                }} onKeyDown={event => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }} />
            </label>
            <span>{storageError ? 'Draft not saved' : 'Draft saved on this browser'}</span>
            <a href="/projects" onClick={event => navigate('/projects', event)}>All projects</a>
          </div>
          <div className="layout">
          {voicePicker}
          <section className="panel editor" aria-labelledby="script">
            <div className="row">
              <h2 id="script"><FileText size={19} aria-hidden="true" /> Script</h2>
              <span>{characters} / 1600 characters</span>
            </div>
            {!selectedVoiceSupportsLanguage && (
              <p className="help">Choose Hindi or Hinglish, or select another voice for this script.</p>
            )}
            <div className="editor-tools">
              <button type="button" aria-expanded={pasteOpen} disabled={Boolean(busy)}
                onClick={() => setPasteOpen(!pasteOpen)}><ClipboardPaste size={16} aria-hidden="true" /> Paste a script</button>
            </div>
            {pasteOpen && (
              <form className="paste" onSubmit={event => {
                event.preventDefault()
                importScript()
              }}>
                <label>Script <textarea rows={5} maxLength={1624} required
                  placeholder="Paste your script. Quoted speech and lines marked Dialogue: or संवाद: become separate segments."
                  value={pastedScript} onChange={event => setPastedScript(event.target.value)} /></label>
                <button type="submit" disabled={Boolean(busy)}>Use this script</button>
              </form>
            )}
            <div className="script-delivery">
              <label>Saved voice presets
                <select aria-label="Saved voice presets" value={narratorSaved ? narratorVoice?.id : ''}
                  disabled={Boolean(busy) || !compatiblePresets.length} onChange={event => {
                    const selected = compatiblePresets.find(voice => voice.id === event.target.value)
                    if (selected) setNarratorVoice(selected)
                  }}>
                  <option value="">Choose a saved voice</option>
                  {compatiblePresets.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
                </select>
              </label>
              <button type="button" disabled={Boolean(busy) || !narratorVoice || narratorSaved}
                onClick={() => {
                  if (narratorVoice) setProjects(current => ({
                    ...current, voicePresets: [...(current.voicePresets || []), narratorVoice],
                  }))
                }}>{narratorSaved ? 'Voice preset saved' : 'Save selected voice'}</button>
            </div>
            <div className="script-delivery">
              <label>Delivery preset
                <select value={scriptPreset} onChange={event => setScriptPreset(event.target.value as Scene['style'])}
                  disabled={Boolean(busy)}>
                  {deliveryPresets.map(([style, label]) => <option key={style} value={style}>{label}</option>)}
                </select>
              </label>
              <button type="button" disabled={Boolean(busy) || scenes.every(scene => scene.style === scriptPreset)}
                onClick={() => setScenes(scenes.map(scene => setDelivery(scene, scriptPreset)))}>
                Apply to all lines
              </button>
              <label>Voice speed
                <select value={scriptSpeed} disabled={Boolean(busy)} onChange={event => {
                  const speed = event.target.value as Speed
                  setScenes(scenes.map(scene => ({ ...scene, speed })))
                }}>
                  {speedOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <PauseField label="Gap between segments" automatic value={segmentGapMs}
                disabled={Boolean(busy)} onChange={value => updateProject({ segmentGapMs: value })} />
            </div>
            <p className="help">Warning and Reveal use pace, pauses and level. Kokoro does not have a whisper or emotion prompt.</p>
            {take && !gapMatches && <p className="help">Generate a new take to apply a different gap between segments.</p>}
            {hasCharacterLines && !canUseCharacters && <p className="help">Switch to Hindi or Hinglish with local Kokoro, or set all speakers back to Narrator.</p>}
            <div className="script-lines" key={project.id}>
            {scenes.map((scene, index) => (
              <details className="script-line" key={index} open={activeLine === index}>
                <summary onClick={event => {
                  event.preventDefault()
                  setActiveLine(activeLine === index ? -1 : index)
                }}>
                  <span className="line-number">Line {index + 1} · {scene.kind === 'dialogue' ? 'Dialogue' : 'Narration'}</span>
                  <span className="line-excerpt">{scene.text || 'Write this line…'}</span>
                </summary>
              <fieldset disabled={Boolean(busy)} aria-label={`Edit line ${index + 1}`}>
                <textarea aria-label={`Script line ${index + 1}`} rows={2} maxLength={500}
                  value={scene.text} onChange={event => updateScene(index, { text: event.target.value.replace(/[\r\n]+/g, ' ') })} />
                <div className="actions line-basic-actions">
                  <button type="button" disabled={scenes.length < 2} onClick={() => {
                    setScenes(scenes.filter((_, position) => index !== position))
                  }}><Trash2 size={15} aria-hidden="true" /> Remove</button>
                </div>
                <details className="line-settings">
                  <summary>Line settings</summary>
                  <div className="line-controls line-voice-controls">
                    {(canUseCharacters || hasCharacterLines) && <label>Speaker
                      <select aria-label={`Speaker for line ${index + 1}`} value={scene.speaker ?? 'narrator'}
                        onChange={event => updateScene(index, { speaker: event.target.value as Speaker })}>
                        {speakerOptions.map(([speaker, label]) => <option key={speaker} value={speaker}
                          disabled={speaker !== 'narrator' && (!canUseCharacters || !status?.local_character_voices?.includes(speaker))}>{label}</option>)}
                      </select>
                    </label>}
                    <label>Delivery <select value={scene.style}
                      onChange={event => updateScene(index, setDelivery(scene, event.target.value as Scene['style']))}>
                      {styles.map(style => <option key={style} value={style}>{style[0].toUpperCase() + style.slice(1)}</option>)}
                    </select></label>
                  </div>
                  <div className="line-controls">
                    <PauseField label="Extra pause after" idLabel={`Extra pause after line ${index + 1}`}
                      value={scene.pause_after_ms}
                      onChange={value => updateScene(index, { pause_after_ms: value })} />
                    <label>Speed
                      <select aria-label={`Speed for line ${index + 1}`} value={scene.speed ?? 'normal'}
                        onChange={event => updateScene(index, { speed: event.target.value as Speed })}>
                        {speedOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>Gain
                      <select aria-label={`Gain for line ${index + 1}`} value={scene.gain_db ?? 0}
                        onChange={event => updateScene(index, { gain_db: Number(event.target.value) })}>
                        {[-12, -6, -3, 0, 3, 6].map(db => <option key={db} value={db}>{db > 0 ? '+' : ''}{db} dB</option>)}
                      </select>
                    </label>
                    {sceneLayoutMatches && (
                      <button type="button" disabled={!gapMatches || !scene.text.trim() || invalid || !canGenerate
                        || changedLines.some((changed, position) => changed && position !== index)}
                        onClick={() => generate(index)}><RotateCcw size={15} aria-hidden="true" /> Retake line</button>
                    )}
                  </div>
                  <div className="actions segment-audio-actions">
                    <PauseField label="Pause before" idLabel={`Pause before line ${index + 1}`}
                      value={scene.pause_before_ms}
                      onChange={value => updateScene(index, { pause_before_ms: value })} />
                    {status?.provider === 'demo' && <button type="button" disabled={invalid || !canGenerate
                      || !selectedVoiceSupportsLanguage || (hasCharacterLines && !canUseCharacters)}
                      onClick={() => previewLine(index)}>
                      <Play size={15} aria-hidden="true" /> Preview segment
                    </button>}
                    {take && take.scenes[index] && <a className="export-link" aria-label="Download saved segment WAV"
                      href={`/api/takes/${take.id}/segments/${index}/wav?download=true`}><Download size={15} aria-hidden="true" /> Segment WAV</a>}
                  </div>
                  {segmentPreview?.index === index && (
                    <audio aria-label={`Preview of line ${index + 1}`} controls autoPlay src={segmentPreview.url} />
                  )}
                </details>
              </fieldset>
              </details>
            ))}
            </div>
            <div className="editor-generate-bar">
            <div className="actions">
              <button disabled={Boolean(busy) || scenes.length >= 24}
                onClick={() => {
                  setActiveLine(scenes.length)
                  setScenes([...scenes, { text: '', style: 'auto', speed: scriptSpeed }])
                }}><Plus size={17} aria-hidden="true" /> Add line</button>
              <button className="primary generate-button" aria-busy={renderingNarration}
                disabled={Boolean(busy) || invalid || !canGenerate || !selectedVoiceSupportsLanguage || (hasCharacterLines && !canUseCharacters)}
                onClick={() => generate()}>
                {renderingNarration ? <><RenderActivity /> Generating narration…</>
                  : <><Play size={16} aria-hidden="true" /> Generate narration</>}
              </button>
            </div>
            {renderingNarration && (
              <p className="generation-status" role="status">
                {narratorVoice ? `Creating a new take with ${narratorVoice.name}.` : 'Creating your new take.'}
                {' '}It will appear under Takes when ready.
              </p>
            )}
            </div>
            {sceneLayoutMatches && changedLines.filter(Boolean).length > 1 && (
              <p className="help">Generate a new take to apply edits to several lines.</p>
            )}
            {sceneLayoutMatches && (
              <label className="check">
                <input type="checkbox" checked={keepTiming} onChange={event => updateProject({ keepTiming: event.target.checked })} />
                Keep later lines at their current times
              </label>
            )}
            {sceneLayoutMatches && <p className="help">Retakes keep the original voice and language. Generate narration to use a different voice.</p>}
          </section>
          <aside>
            <section className="panel" aria-labelledby="takes">
              <h2 id="takes"><Headphones size={19} aria-hidden="true" /> Takes</h2>
              {project.takeIds.length > 1 && <label className="take-history">Take history
                <select value={takeId || ''} disabled={Boolean(busy)}
                  onChange={event => setViewTakeId(event.target.value)}>
                  {project.takeIds.map((id, index) => (
                    <option value={id} key={id}>Take {index + 1}{index === project.takeIds.length - 1 ? ' (latest)' : ''}</option>
                  ))}
                </select>
              </label>}
              {!take && (
                <div className="empty-take">
                  <span className="sound-icon"><AudioLines size={22} aria-hidden="true" /></span>
                  <h3>Your first take will appear here</h3>
                  <p>Generate narration to listen and download your audio and captions.</p>
                </div>
              )}
              {take && <TakePlayer take={take} />}
              {previous && take && <TakePlayer take={previous} comparison />}
            </section>
            <section className="panel studio-voice-link">
              <h2>Use your own voice</h2>
              <p>{status?.voice ? `${status.voice.name} is available in the voice picker.` : 'Record or upload a sample in the Voice Library.'}</p>
              <a href="/voices" onClick={event => navigate('/voices', event)}>Go to Voice Library</a>
            </section>
            <section className="panel" aria-labelledby="pronunciation">
              <h2 id="pronunciation">Pronunciations</h2>
              <p>Project entries take priority over the dictionary shared across episodes.</p>
              <label>Dictionary
                <select aria-label="Pronunciation dictionary" value={sharedDictionary ? 'shared' : 'project'}
                  disabled={Boolean(busy)} onChange={event => {
                    setAliases({})
                    setSharedDictionary(event.target.value === 'shared')
                  }}>
                  <option value="project">This project</option>
                  <option value="shared">All projects</option>
                </select>
              </label>
              <form onSubmit={event => {
                event.preventDefault()
                const form = event.currentTarget
                const data = new FormData(form)
                void perform('Saving pronunciation', async () => {
                  setAliases(await api(dictionaryUrl, json('PUT', {
                    written: data.get('written'), spoken: data.get('spoken'),
                  })))
                  form.reset()
                })
              }}>
                <label>Written word <input name="written" required maxLength={100} placeholder="Nguyen" /></label>
                <label>Say it as <input name="spoken" required maxLength={100} placeholder="Nwin" /></label>
                <button disabled={Boolean(busy)}>Save pronunciation</button>
              </form>
              {Object.entries(aliases).map(([written, spoken]) => (
                <div className="alias" key={written}>
                  <span>{written} → {spoken}</span>
                  <button disabled={Boolean(busy)} aria-label={`Remove pronunciation for ${written}`} onClick={() => {
                    void perform('Removing pronunciation', async () => {
                      setAliases(await api(dictionaryUrl + '&written=' + encodeURIComponent(written), { method: 'DELETE' }))
                    })
                  }}>Remove</button>
                </div>
              ))}
            </section>
          </aside>
        </div></>}
        {!['/', '/studio', '/projects', '/voices', '/help'].includes(path) && (
          <section className="page-heading">
            <h1 id="page-title" tabIndex={-1}>Page not found</h1>
            <a href="/" onClick={event => navigate('/', event)}>Go to VoiceTake home</a>
          </section>
        )}
    </SiteFrame>
  )
}

createRoot(document.getElementById('root')!).render(<Studio />)
