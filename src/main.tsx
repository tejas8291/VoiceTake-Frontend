import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ClipboardPaste, Download, FileText, Pencil,
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
import { StudioPlayer } from './StudioPlayer'
import { RenderActivity } from './RenderActivity'
import { api, asset, detectLanguage, json, styles, voiceName, waitForTake } from './api'
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
  const [renaming, setRenaming] = useState(false)
  const [voiceTab, setVoiceTab] = useState<'browse' | 'mine'>('browse')
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
    setRenaming(false)
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
    setActiveLine(0)
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

  const voicePicker = <VoicePicker compact={path === '/studio'} status={status} language={language}
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
              {path === '/studio' ? <div className="project-heading">
                {renaming ? <input autoFocus aria-label="Current project name" defaultValue={project.name}
                  maxLength={80} disabled={Boolean(busy)} onBlur={event => {
                    const name = event.target.value.trim()
                    if (name && name !== project.name) updateProject({ name })
                    setRenaming(false)
                  }} onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                    if (event.key === 'Escape') setRenaming(false)
                  }} /> : <>
                  <h1 id="page-title" tabIndex={-1}>{project.name}</h1>
                  <button type="button" className="rename-project" aria-label="Rename project"
                    disabled={Boolean(busy)} onClick={() => setRenaming(true)}><Pencil size={18} aria-hidden="true" /></button>
                </>}
              </div> : <h1 id="page-title" tabIndex={-1}>Voice library</h1>}
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
          <div className="voice-library">
            <div className="library-tabs" role="tablist" aria-label="Voice library" onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 'browse' : event.key === 'End' ? 'mine' : voiceTab === 'browse' ? 'mine' : 'browse'
              setVoiceTab(next)
              document.getElementById(next === 'browse' ? 'browse-voices-tab' : 'my-voice-tab')?.focus()
            }}>
              <button id="browse-voices-tab" role="tab" tabIndex={voiceTab === 'browse' ? 0 : -1} aria-selected={voiceTab === 'browse'} aria-controls="voice-library-panel"
                onClick={() => setVoiceTab('browse')}>Browse voices</button>
              <button id="my-voice-tab" role="tab" tabIndex={voiceTab === 'mine' ? 0 : -1} aria-selected={voiceTab === 'mine'} aria-controls="voice-library-panel"
                onClick={() => setVoiceTab('mine')}>My voice</button>
            </div>
            <div id="voice-library-panel" role="tabpanel" aria-labelledby={voiceTab === 'browse' ? 'browse-voices-tab' : 'my-voice-tab'}>
              {voiceTab === 'browse' ? voicePicker : <VoiceProfile status={status} disabled={Boolean(busy)} navigate={navigate}
                createVoice={createVoice} deleteVoice={deleteVoice} />}
            </div>
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
            <span>{storageError ? 'Draft not saved' : 'Draft saved on this browser'}</span>
            <a href="/projects" onClick={event => navigate('/projects', event)}>All projects</a>
          </div>
          <div className="layout">
          <section className="panel editor" aria-labelledby="script">
            <div className="script-editor-header">
            <div className="row">
              <h2 id="script"><FileText size={19} aria-hidden="true" /> Script</h2>
              <span>{characters} / 1600 characters</span>
            </div>
              <button type="button" aria-expanded={pasteOpen} disabled={Boolean(busy)}
                onClick={() => setPasteOpen(!pasteOpen)}><ClipboardPaste size={16} aria-hidden="true" /> Paste a script</button>
            </div>
            {!selectedVoiceSupportsLanguage && (
              <p className="help">Choose Hindi or Hinglish, or select another voice for this script.</p>
            )}
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
            <div className="script-lines" key={project.id}>
            {scenes.map((scene, index) => (
              <details className="script-line" key={index} open={activeLine === index}>
                <summary onClick={event => {
                  event.preventDefault()
                  setActiveLine(activeLine === index ? -1 : index)
                }}>
                  <span className="line-number">Line {index + 1} · {scene.kind === 'dialogue' ? 'Dialogue' : 'Narration'}</span>
                  <span className="line-speaker-name">{scene.speaker && scene.speaker !== 'narrator'
                    ? voiceName({ id: scene.speaker, name: scene.speaker })
                    : narratorVoice ? 'Narrator · ' + voiceName(narratorVoice) : 'Narrator'}</span>
                  {activeLine !== index && <span className="line-excerpt">{scene.text || 'Write this line…'}</span>}
                </summary>
              <fieldset disabled={Boolean(busy)} aria-label={`Edit line ${index + 1}`}>
                <div className="line-speaker">
                  {(canUseCharacters || hasCharacterLines) && <label>Speaker
                      <select aria-label={`Speaker for line ${index + 1}`} value={scene.speaker ?? 'narrator'}
                        onChange={event => updateScene(index, { speaker: event.target.value as Speaker })}>
                        {speakerOptions.map(([speaker, label]) => <option key={speaker} value={speaker}
                          disabled={speaker !== 'narrator' && (!canUseCharacters || !status?.local_character_voices?.includes(speaker))}>{label}</option>)}
                      </select>
                    </label>}
                </div>
                <textarea aria-label={`Script line ${index + 1}`} rows={2} maxLength={500}
                  value={scene.text} onChange={event => updateScene(index, { text: event.target.value.replace(/[\r\n]+/g, ' ') })} />
                <div className="actions line-basic-actions">
                    {status?.provider === 'demo' && <button type="button" disabled={invalid || !canGenerate
                      || !selectedVoiceSupportsLanguage || (hasCharacterLines && !canUseCharacters)}
                      onClick={() => previewLine(index)}>
                      <Play size={15} aria-hidden="true" /> Preview line
                    </button>}
                    {sceneLayoutMatches && (
                      <button type="button" disabled={!gapMatches || !scene.text.trim() || invalid || !canGenerate
                        || changedLines.some((changed, position) => changed && position !== index)}
                        onClick={() => generate(index)}><RotateCcw size={15} aria-hidden="true" /> Retake line</button>
                    )}
                </div>
                  {segmentPreview?.index === index && (
                    <audio aria-label={`Preview of line ${index + 1}`} controls autoPlay src={segmentPreview.url} />
                  )}
                <details className="line-settings">
                  <summary>Line settings</summary>
                  <div className="line-controls line-voice-controls">
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
                  </div>
                  <div className="actions segment-audio-actions">
                    <PauseField label="Pause before" idLabel={`Pause before line ${index + 1}`}
                      value={scene.pause_before_ms}
                      onChange={value => updateScene(index, { pause_before_ms: value })} />
                    {take && take.scenes[index] && <a className="export-link" aria-label="Download saved segment WAV"
                      href={`/api/takes/${take.id}/segments/${index}/wav?download=true`}><Download size={15} aria-hidden="true" /> Segment WAV</a>}
                  </div>
                <div className="actions line-basic-actions">
                  <button type="button" disabled={scenes.length < 2} onClick={() => {
                    setActiveLine(Math.max(0, index - 1))
                    setScenes(scenes.filter((_, position) => index !== position))
                  }}><Trash2 size={15} aria-hidden="true" /> Remove</button>
                </div>
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
            {hasCharacterLines && !canUseCharacters && <p className="help">Switch to Hindi or Hinglish with local Kokoro, or set all speakers back to Narrator.</p>}
            {invalid && <p className="help" role="status">{characters > 1600
              ? 'Use up to 1600 characters per narration.'
              : `Line ${scenes.findIndex(scene => !scene.text.trim()) + 1} is empty. Add text before generating.`}</p>}
            {renderingNarration && (
              <p className="generation-status" role="status">
                {narratorVoice ? `Creating a new take with ${voiceName(narratorVoice)}.` : 'Creating your new take.'}
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
          <aside className="studio-side">
            {voicePicker}
            <details className="panel director-settings">
              <summary>Delivery</summary>
            <div className="script-delivery">
              <label>Saved voice presets
                <select aria-label="Saved voice presets" value={narratorSaved ? narratorVoice?.id : ''}
                  disabled={Boolean(busy) || !compatiblePresets.length} onChange={event => {
                    const selected = compatiblePresets.find(voice => voice.id === event.target.value)
                    if (selected) setNarratorVoice(selected)
                  }}>
                  <option value="">Choose a saved voice</option>
                  {compatiblePresets.map(voice => <option key={voice.id} value={voice.id}>{voiceName(voice)}</option>)}
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
            </details>
            <details className="panel pronunciation-panel">
              <summary id="pronunciation">Pronunciations</summary>
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
            </details>
            <a className="studio-own-voice" href="/voices" onClick={event => { setVoiceTab('mine'); navigate('/voices', event) }}>Use your own voice</a>
          </aside>
        </div>
        <StudioPlayer take={take} previous={previous} takeId={takeId} takeIds={project.takeIds}
          disabled={Boolean(busy)} onSelect={setViewTakeId} />
        </>}
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
