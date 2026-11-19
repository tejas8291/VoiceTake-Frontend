import { useEffect, useRef, useState } from 'react'
import { Mic2, Square, Upload } from 'lucide-react'
import type { StudioStatus } from './api'
import type { Navigate } from './Site'

const maxRecordingSeconds = 120
const maxRecordingBytes = 10 * 1024 * 1024

type Props = {
  status?: StudioStatus
  disabled: boolean
  navigate: Navigate
  createVoice: (data: FormData) => void
  deleteVoice: () => void
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function VoiceProfile({ status, disabled, navigate, createVoice, deleteVoice }: Props) {
  const [source, setSource] = useState<'record' | 'upload'>('record')
  const [recording, setRecording] = useState(false)
  const [openingMic, setOpeningMic] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [file, setFile] = useState<File>()
  const [sampleUrl, setSampleUrl] = useState('')
  const [message, setMessage] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const active = useRef(true)
  const stream = useRef<MediaStream | null>(null)
  const hosted = status?.provider === 'elevenlabs'

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      stream.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!file) {
      setSampleUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setSampleUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!recording) return
    const start = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Math.min(maxRecordingSeconds, Math.floor((Date.now() - start) / 1000))
      setSeconds(elapsed)
      if (elapsed >= maxRecordingSeconds && recorder.current?.state === 'recording') recorder.current.stop()
    }, 250)
    return () => window.clearInterval(timer)
  }, [recording])

  function chooseFile(next?: File) {
    setFile(undefined)
    setMessage('')
    if (!next) return
    if (!next.size || next.size > maxRecordingBytes) {
      setMessage('Choose a non-empty recording under 10 MB.')
      return
    }
    setFile(next)
  }

  async function startRecording() {
    setMessage('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage('Recording is unavailable in this browser. You can upload an audio file instead.')
      return
    }
    const format = [
      ['audio/webm;codecs=opus', 'webm'],
      ['audio/mp4', 'm4a'],
      ['audio/ogg;codecs=opus', 'ogg'],
    ].find(([mime]) => MediaRecorder.isTypeSupported(mime))
    if (!format) {
      setMessage('This browser has no supported recording format. Upload a file instead.')
      return
    }
    setOpeningMic(true)
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
      if (!active.current) {
        input.getTracks().forEach(track => track.stop())
        return
      }
      stream.current = input
      const [mime, extension] = format
      const device = new MediaRecorder(input, { mimeType: mime, audioBitsPerSecond: 96000 })
      const chunks: Blob[] = []
      recorder.current = device
      device.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data)
      }
      device.onerror = () => {
        setMessage('Recording stopped unexpectedly. Try again or upload a file.')
      }
      device.onstop = () => {
        input.getTracks().forEach(track => track.stop())
        if (!active.current) return
        setRecording(false)
        if (chunks.length) chooseFile(new File(chunks, 'my-voice.' + extension, { type: device.mimeType }))
      }
      device.start()
      setFile(undefined)
      setSeconds(0)
      setRecording(true)
    } catch {
      stream.current?.getTracks().forEach(track => track.stop())
      if (active.current) setMessage('VoiceTake could not access the microphone. Check browser permissions or upload a recording.')
    } finally {
      if (active.current) setOpeningMic(false)
    }
  }

  return (
    <section className="panel personal-voice" aria-labelledby="personal-voice-title">
      <div className="section-title">
        <span className="icon-tile"><Mic2 size={20} aria-hidden="true" /></span>
        <div><h2 id="personal-voice-title">Your voice</h2><p>Use your voice for new scripts.</p></div>
      </div>
      {status?.voice ? (
        <div className="profile-active">
          <h3>{status.voice.name}</h3>
          {sampleUrl && <div className="sample-preview"><h3>Your reference recording</h3><audio src={sampleUrl} controls preload="metadata" /></div>}
          <p>{status.voice.requires_verification ? 'Complete any required verification in ElevenLabs, then try a take in the Studio.' : 'Your private voice is available in the Studio voice picker.'}</p>
          <div className="actions">
            <a className="site-cta" href="/studio" onClick={event => navigate('/studio', event)}>Use voice in Studio</a>
            <button disabled={disabled} onClick={deleteVoice}>Delete voice clone</button>
          </div>
        </div>
      ) : (
        <>
          <p>Record in a quiet room for 1–2 minutes. Use your everyday speaking voice and leave out music or other speakers.</p>
          <div className="actions recording-tabs" aria-label="Audio source">
            <button type="button" aria-pressed={source === 'record'} disabled={disabled || recording || openingMic}
              onClick={() => { setSource('record'); chooseFile() }}><Mic2 size={16} aria-hidden="true" /> Record</button>
            <button type="button" aria-pressed={source === 'upload'} disabled={disabled || recording || openingMic}
              onClick={() => { setSource('upload'); chooseFile() }}><Upload size={16} aria-hidden="true" /> Upload</button>
          </div>
          {source === 'record' ? (
            <div className="recording-box">
              <span className={recording ? 'recording-time is-recording' : 'recording-time'}>{formatTime(seconds)}</span>
              {recording ? <button type="button" onClick={() => recorder.current?.stop()}>
                <Square size={15} aria-hidden="true" /> Stop recording
              </button> : <button type="button" disabled={openingMic || disabled} onClick={() => void startRecording()}>
                <Mic2 size={16} aria-hidden="true" /> {openingMic ? 'Opening microphone…' : 'Start recording'}
              </button>}
            </div>
          ) : <label className="upload-label">Audio file
            <input type="file" accept=".wav,.mp3,.m4a,.webm,.ogg" disabled={disabled}
              onChange={event => chooseFile(event.target.files?.[0])} />
          </label>}
          {sampleUrl && <div className="sample-preview"><h3>Your recording</h3><audio src={sampleUrl} controls preload="metadata" /></div>}
          {message && <p role="alert" className="voice-error">{message}</p>}
          {hosted ? (
            <form className="clone-form" onSubmit={event => {
              event.preventDefault()
              if (!file || disabled || recording) return
              const data = new FormData(event.currentTarget)
              data.set('audio', file)
              createVoice(data)
            }}>
              <label>Voice name <input name="name" maxLength={60} required placeholder="My narration voice" /></label>
              <label className="check"><input type="checkbox" name="consent" value="true" required /> This is my voice and I consent to sending this sample to ElevenLabs.</label>
              <button className="primary" disabled={disabled || !file || recording || openingMic}>Create private voice</button>
            </form>
          ) : <p className="profile-note">You can record and preview here. Creating a private voice requires a connected voice service.</p>}
        </>
      )}
    </section>
  )
}
