import { useEffect, useState } from 'react'
import { Pencil, Play, Trash2 } from 'lucide-react'
import { json } from './api'
import type { LanguageChoice, Pronunciations, Scene } from './api'

type Props = {
  aliases: Pronunciations
  disabled: boolean
  localPreview: boolean
  scene?: Scene
  language: LanguageChoice
  voiceId?: string
  projectId: string
  run: (label: string, action: () => Promise<void>) => Promise<void>
  save: (written: string, spoken: string) => Promise<void>
  remove: (written: string) => Promise<void>
}

export function PronunciationEditor(props: Props) {
  const [written, setWritten] = useState('')
  const [spoken, setSpoken] = useState('')
  const [editing, setEditing] = useState(false)
  const [audio, setAudio] = useState<string>()
  const [message, setMessage] = useState('')
  const normalizedWord = written.trim().normalize('NFC')
  const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const activeText = props.scene?.text.trim().normalize('NFC') || ''
  const containsWord = Boolean(normalizedWord) && new RegExp(
    `(?<![\\p{L}\\p{N}\\p{M}_\\u200c\\u200d])${escapedWord}(?![\\p{L}\\p{N}\\p{M}_\\u200c\\u200d])`, 'iu',
  ).test(activeText)
  const previewText = containsWord ? activeText : normalizedWord
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio) }, [audio])
  useEffect(() => setAudio(undefined), [props.scene, props.voiceId, props.language])

  function change(field: 'written' | 'spoken', value: string) {
    setAudio(undefined)
    setMessage('')
    if (field === 'written') setWritten(value)
    else setSpoken(value)
  }

  function reset() {
    setWritten(''); setSpoken(''); setEditing(false); setAudio(undefined)
  }

  return <div className="pronunciation-editor">
    <form onSubmit={event => {
      event.preventDefault()
      void props.run('Saving pronunciation', async () => {
        await props.save(written.trim(), spoken.trim())
        reset()
        setMessage('Pronunciation saved. Generate or retake a line to hear it in your narration.')
      })
    }}>
      <label>Written word <input value={written} disabled={props.disabled || editing} required maxLength={100}
        onChange={event => change('written', event.target.value)} placeholder="बेडरूम" /></label>
      <label>Say it as <input value={spoken} disabled={props.disabled} required maxLength={100}
        onChange={event => change('spoken', event.target.value)} placeholder="बेड रूम" /></label>
      <p className="help">Only the spoken pronunciation changes. Your script and subtitles keep the original spelling.</p>
      <div className="actions">
        <button type="button" disabled={props.disabled || !props.localPreview || !written.trim() || !spoken.trim()}
          onClick={() => void props.run('Previewing pronunciation', async () => {
            setAudio(undefined)
            const response = await fetch('/api/pronunciations/preview', json('POST', {
              scenes: [{ ...props.scene, text: previewText, pause_before_ms: 0, pause_after_ms: 0 }], index: 0,
              language: props.language, voice_id: props.voiceId, project_id: props.projectId,
              segment_gap_ms: 0, pronunciation: { written: written.trim(), spoken: spoken.trim() },
            }))
            if (!response.ok) {
              const error = await response.json().catch(() => ({}))
              throw new Error(typeof error.detail === 'string' ? error.detail : 'Could not preview this pronunciation.')
            }
            setAudio(URL.createObjectURL(await response.blob()))
            setMessage('Preview only. Save this pronunciation to use it in future generations.')
          })}><Play size={15} aria-hidden="true" /> Preview pronunciation</button>
        <button disabled={props.disabled || !written.trim() || !spoken.trim()}>{editing ? 'Update pronunciation' : 'Save pronunciation'}</button>
        {editing && <button type="button" disabled={props.disabled} onClick={reset}>Cancel</button>}
      </div>
      <p className="help">Preview uses the active speaker. If the active line contains this word, you will hear it in that sentence; otherwise you will hear the word alone.</p>
      {normalizedWord && <p className="pronunciation-sample" lang={props.language === 'en' ? 'en' : 'hi'}>Preview text: {previewText}</p>}
      {!props.localPreview && <p className="help">Pronunciation preview is available with local voices.</p>}
    </form>
    {audio && <audio controls src={audio} aria-label="Pronunciation preview" />}
    {message && <p role="status" className="help">{message}</p>}
    {Object.keys(props.aliases).length === 0 && <p className="help">No saved pronunciations in this dictionary yet.</p>}
    {Object.entries(props.aliases).map(([word, pronunciation]) => <div className="alias" key={word}>
      <span><strong>{word}</strong><span aria-hidden="true"> → </span>{pronunciation}</span>
      <div className="actions">
        <button type="button" disabled={props.disabled} aria-label={`Edit pronunciation for ${word}`} onClick={() => {
          setWritten(word); setSpoken(pronunciation); setEditing(true); setMessage(''); setAudio(undefined)
        }}><Pencil size={14} aria-hidden="true" /> Edit</button>
        <button type="button" disabled={props.disabled} aria-label={`Remove pronunciation for ${word}`}
          onClick={() => void props.run('Removing pronunciation', async () => {
            await props.remove(word)
            if (written === word) reset()
            setMessage('Pronunciation removed.')
          })}><Trash2 size={14} aria-hidden="true" /></button>
      </div>
    </div>)}
  </div>
}
