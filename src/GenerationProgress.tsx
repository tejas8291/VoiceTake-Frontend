import type { Take } from './api'
import { RenderActivity } from './RenderActivity'

export function GenerationProgress({ take, retaking }: { take?: Take; retaking: boolean }) {
  const progress = take?.progress
  const stage = progress?.stage
  const failed = stage === 'failed'
  const step = stage === 'complete' ? 3 : stage === 'assembling' ? 2
    : stage === 'generating' ? 1 : 0
  const message = !take ? 'Sending your request…'
    : !progress ? 'Generating your audio…'
    : stage === 'queued' ? 'Preparing your voice and script…'
    : stage === 'assembling' ? 'Combining audio and timing subtitles…'
    : stage === 'complete' ? 'Your narration is ready.'
    : failed ? 'Generation stopped. Check the error message before trying again.'
    : progress.current_line ? `${retaking ? 'Retaking' : 'Generating'} line ${progress.current_line}…`
    : 'Generating your audio…'
  const steps = ['Prepare', retaking ? 'Retake line' : 'Generate lines', 'Finish audio']
  return <section className="generation-progress" data-stage={stage || 'requesting'} aria-label="Narration generation progress">
    <div className="generation-progress-heading"><RenderActivity />
      <div><strong>{retaking ? 'Updating your line' : 'Creating your narration'}</strong>
        <p role="status" aria-live="polite" aria-atomic="true">{message}</p></div>
      {progress && <span className="generation-count" aria-label={`${progress.completed} of ${progress.total} lines generated`}>
        {progress.completed}<span> / {progress.total}</span>
      </span>}
    </div>
    {progress && !failed && <ol className="generation-steps" aria-label="Generation stages">
      {steps.map((label, index) => <li key={label} data-state={index < step ? 'done' : index === step ? 'active' : 'waiting'}
        aria-current={index === step ? 'step' : undefined}>
        <span aria-hidden="true">{index < step ? '✓' : index + 1}</span>{label}
      </li>)}
    </ol>}
    <progress aria-label="Voice lines completed" max={progress?.total || 1}
      value={progress ? progress.completed : undefined} />
    <p className="help">{progress ? `${progress.completed} of ${progress.total} ${progress.total === 1 ? 'line' : 'lines'} generated. ` : ''}
      {progress?.operation === 'retake' ? 'Other lines are reused. ' : ''}
      {stage === 'assembling' ? 'Speech is generated; finishing the export.' : 'Your take will appear in the player when ready.'}</p>
  </section>
}
