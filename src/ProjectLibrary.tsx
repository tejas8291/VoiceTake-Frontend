import { useState } from 'react'
import { ArrowRight, FileText, Plus } from 'lucide-react'
import { languageNames } from './api'
import type { Project } from './projects'

type Props = {
  projects: Project[]
  disabled: boolean
  onOpen: (id: string) => void
  onCreate: (name: string) => void
}


const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function ProjectLibrary({ projects, disabled, onOpen, onCreate }: Props) {
  const [creating, setCreating] = useState(false)
  return (
    <>
      <div className="page-heading">
        <div><h1 id="page-title" tabIndex={-1}>Projects</h1><p>Pick up a draft or start a new voiceover.</p></div>
        <button className="primary" type="button" disabled={disabled} aria-expanded={creating}
          aria-controls="new-project-form" onClick={() => setCreating(value => !value)}>
          <Plus size={17} aria-hidden="true" /> New project
        </button>
      </div>
      {creating && <form id="new-project-form"  className="project-create" onSubmit={event => {
        event.preventDefault()
        const form = event.currentTarget
        const name = String(new FormData(form).get('project-name') || '').trim()
        if (!name) return
        onCreate(name)
        form.reset()
        setCreating(false)
      }}>
        <label>Project name <input autoFocus name="project-name" maxLength={80} required placeholder="e.g. Monday Shorts" /></label>
        <button className="primary" disabled={disabled}>Create project</button>
        <button type="button" onClick={() => setCreating(false)}>Cancel</button>
      </form>}
      <ul className="project-list">
        {[...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map(project => (
          <li className="panel project-card" key={project.id}>
            <span className="icon-tile"><FileText size={19} aria-hidden="true" /></span>
            <div>
              <h2>{project.name}</h2>
              <p>{project.language === 'auto' ? 'Automatic language' : languageNames[project.language]} · {project.takeIds.length
                ? `${project.takeIds.length} saved ${project.takeIds.length === 1 ? 'take' : 'takes'}` : '0 saved takes'}</p>
              <small>Updated {dateFormat.format(new Date(project.updatedAt))}</small>
            </div>
            <button aria-label={`Continue editing ${project.name}`} type="button" disabled={disabled} onClick={() => onOpen(project.id)}>
              Continue editing <ArrowRight size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
