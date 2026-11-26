import type { Take } from './api'
import { RenderActivity } from './RenderActivity'

export function GenerationProgress({ take, retaking }: { take?: Take; retaking: boolean }) {
  const progress = take?.progress
  const message = !take ? 'Sending your request…'
    : !progress ? 'Generating your audio…'
    : progress.stage === 'queued' ? 'Request accepted. Preparing generation…'
    : progress.stage === 'assembling' ? 'Combining audio and subtitles…'
    : progress.stage === 'complete' ? 'Your narration is ready.'
    : progress.stage === 'failed' ? 'Generation stopped.'
    : progress.current_line ? `${retaking ? 'Retaking' : 'Generating'} line ${progress.current_line}…`
    : 'Generating your audio…'
  return <section className="generation-progress" aria-label="Narration generation progress">
    <div className="generation-progress-heading"><RenderActivity />
      <div><strong>{retaking ? 'Updating your line' : 'Creating your narration'}</strong>
        <p role="status" aria-live="polite" aria-atomic="true">{message}</p></div>
    </div>
    <progress aria-label="Voice lines completed" max={progress?.total || 1}
      value={progress ? progress.completed : undefined} />
    {progress && <p className="help">{progress.completed} of {progress.total} {progress.total === 1 ? 'line' : 'lines'} generated
      {progress.operation === 'retake' ? ' · Other lines are reused.' : ''}</p>}
    <p className="help">Keep this tab open. Your take will appear in the player when ready.</p>
  </section>
}
