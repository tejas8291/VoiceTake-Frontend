import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

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
  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [audioRef, src])
  return <div className="playback-audio" data-playback={state}>
    <div className="playback-activity">
      <span className="playback-bars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(bar => <i key={bar} />)}
      </span>
      <span className="playback-state" role="status" aria-live="polite" aria-atomic="true">{labels[state]}</span>
    </div>
    <audio ref={audioRef} aria-label={label} controls preload="metadata" src={src}
      onPlay={() => { onPlay(); setState('buffering') }}
      onPlaying={() => setState('playing')}
      onPause={event => setState(event.currentTarget.ended ? 'ended' : 'paused')}
      onEnded={() => setState('ended')}
      onWaiting={() => setState('buffering')}
      onSeeking={event => setState(event.currentTarget.paused ? 'paused' : 'buffering')}
      onSeeked={event => setState(event.currentTarget.paused ? 'paused'
        : event.currentTarget.readyState >= 3 ? 'playing' : 'buffering')}
      onEmptied={() => setState('ready')}
      onError={() => setState('error')} />
  </div>
}
