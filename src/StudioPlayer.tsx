import { useEffect, useRef, useState } from 'react'
import { Captions, Download, Headphones, History } from 'lucide-react'
import { asset, languageNames, voiceName } from './api'
import type { Take } from './api'
import { PlaybackAudio } from './PlaybackAudio'

type Props = {
  take?: Take
  previous?: Take
  takeId?: string
  takeIds: string[]
  disabled: boolean
  onSelect: (id: string) => void
}

export function StudioPlayer({ take, previous, takeId, takeIds, disabled, onSelect }: Props) {
  const dock = useRef<HTMLElement>(null)
  const currentAudio = useRef<HTMLAudioElement>(null)
  const previousAudio = useRef<HTMLAudioElement>(null)
  const [compare, setCompare] = useState(false)

  useEffect(() => setCompare(false), [takeId])
  useEffect(() => {
    const element = dock.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--studio-player-height', element.getBoundingClientRect().height + 'px')
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--studio-player-height')
    }
  }, [])

  return (
    <section ref={dock} className="studio-player" aria-label="Take player">
      <div className="studio-player-inner">
        <div className="take-selection">
          <Headphones size={18} aria-hidden="true" />
          {takeIds.length > 0 ? <label>
            <span className="sr-only">Selected take</span>
            <select aria-label="Selected take" value={takeId || ''} disabled={disabled}
              onChange={event => onSelect(event.target.value)}>
              {takeIds.map((id, index) => <option key={id} value={id}>
                Take {index + 1}{index === takeIds.length - 1 ? ' · Latest' : ''}
              </option>)}
            </select>
          </label> : <strong>Your narration</strong>}
          {take && <small>{take.language && languageNames[take.language]} · {take.duration?.toFixed(1)} s</small>}
        </div>
        {take ? <>
          <div className="dock-playback">
            {take.voice_name && <span className="dock-voice">{voiceName(take.voice_name)}
              {take.scenes.some(scene => scene.speaker && scene.speaker !== 'narrator') ? ' + character voices' : ''}
            </span>}
            <PlaybackAudio key={take.id} audioRef={currentAudio} label="Selected take playback"
              onPlay={() => previousAudio.current?.pause()} src={asset(take, 'narration.wav')} />
          </div>
          <div className="dock-actions">
            {previous && <button type="button" aria-label={compare ? 'Close comparison' : 'Compare with previous'} title="Compare with previous" aria-expanded={compare} aria-controls="previous-take-comparison"
              onClick={() => {
                previousAudio.current?.pause()
                setCompare(value => !value)
              }}><History size={16} aria-hidden="true" /><span className="compare-label">{compare ? 'Close comparison' : 'Compare with previous'}</span></button>}
            <details className="export-menu" key={take.id}>
              <summary><Download size={16} aria-hidden="true" /> Export</summary>
              <div className="export-options">
                <a className="export-link" href={asset(take, 'narration.wav', true)}>Download WAV</a>
                <a className="export-link" href={asset(take, 'narration.mp3', true)}>Download MP3</a>
                <a className="export-link" href={asset(take, 'captions.srt', true)}><Captions size={15} aria-hidden="true" /> Download SRT</a>
              </div>
            </details>
          </div>
        </> : <p className="dock-empty" role="status">{takeId ? 'Loading saved take…' : 'Generate narration to listen and export.'}</p>}
        {compare && previous && <div id="previous-take-comparison" className="take-comparison">
          <div><strong>Previous take</strong><small>{previous.voice_name && voiceName(previous.voice_name)} · {previous.duration?.toFixed(1)} s</small></div>
          <PlaybackAudio key={previous.id} audioRef={previousAudio} label="Previous take playback"
            onPlay={() => currentAudio.current?.pause()} src={asset(previous, 'narration.wav')} />
        </div>}
      </div>
    </section>
  )
}
