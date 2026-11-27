import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { LoaderCircle, RotateCcw } from 'lucide-react'

type State = 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'
const labels: Record<State, string> = {
  ready: 'Ready to play', playing: 'Playing', paused: 'Paused',
  buffering: 'Loading audio…', ended: 'Playback complete', error: 'Audio unavailable',
}

/** Playback activity, not a waveform or a loudness measurement. */
export function PlaybackAudio({ audioRef, label, src, onPlay }: {
  audioRef: RefObject<HTMLAudioElement | null>
  label: string
  src: string
  onPlay: () => void
}) {
  const [state, setState] = useState<State>('ready')
  const [retrySource, setRetrySource] = useState<{ original: string; url: string }>()
  const mediaSource = retrySource?.original === src ? retrySource.url : src
  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [audioRef, src])
  function reloadAudio() {
    const audio = audioRef.current
    if (!audio) return
    setState('buffering')
    // A fresh query prevents a cached failed media response from blocking retry.
    // Keep existing query parameters (including authorization) and never autoplay.
    const url = new URL(src, window.location.href)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.searchParams.set('_vt_retry', String(Date.now()))
      setRetrySource({ original: src, url: url.href })
    } else audio.load()
  }
  return <div className="playback-audio" data-playback={state}>
    <div className="playback-activity">
      {state === 'buffering' ? <LoaderCircle className="playback-loader" size={16} aria-hidden="true" />
        : <span className="playback-bars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(bar => <i key={bar} />)}
      </span>}
      <span className="playback-state" role="status" aria-live="polite" aria-atomic="true">{labels[state]}</span>
      {state === 'error' && <button type="button" className="playback-retry" onClick={reloadAudio}
        aria-label={`Reload ${label.toLowerCase()}`}><RotateCcw size={13} aria-hidden="true" /> Reload audio</button>}
    </div>
    {state === 'error' && <p className="playback-error-help">Could not load this audio. Reload to try the same take again.</p>}
    <audio ref={audioRef} aria-label={label} controls preload="metadata" src={mediaSource}
      onPlay={() => { onPlay(); setState('buffering') }}
      onPlaying={() => setState('playing')}
      onPause={event => setState(event.currentTarget.error ? 'error' : event.currentTarget.ended ? 'ended' : 'paused')}
      onEnded={() => setState('ended')}
      onWaiting={() => setState('buffering')}
      onSeeking={event => setState(event.currentTarget.paused ? 'paused' : 'buffering')}
      onSeeked={event => setState(event.currentTarget.paused ? 'paused'
        : event.currentTarget.readyState >= 3 ? 'playing' : 'buffering')}
      onLoadStart={() => setState('buffering')}
      onLoadedMetadata={event => {
        if (event.currentTarget.paused) setState('ready')
      }}
      onCanPlay={event => {
        if (!event.currentTarget.paused) setState('playing')
        else setState(current => current === 'buffering' ? 'ready' : current)
      }}
      onEmptied={() => setState('buffering')}
      onError={() => setState('error')} />
  </div>
}
