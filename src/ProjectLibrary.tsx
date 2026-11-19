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
  return (
    <>
      <div className="page-heading">
        <div><h1 id="page-title" tabIndex={-1}>Projects</h1><p>Pick up a draft or start a new voiceover.</p></div>
      </div>
      <form className="project-create" onSubmit={event => {
        event.preventDefault()
        const form = event.currentTarget
        const name = String(new FormData(form).get('project-name') || '').trim()
        if (!name) return
        onCreate(name)
        form.reset()
      }}>
        <label>Project name <input name="project-name" maxLength={80} required placeholder="e.g. Monday Shorts" /></label>
        <button className="primary" disabled={disabled}><Plus size={17} aria-hidden="true" /> New project</button>
      </form>
      <ul className="project-list">
        {[...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map(project => (
          <li className="panel project-card" key={project.id}>
            <span className="icon-tile"><FileText size={19} aria-hidden="true" /></span>
            <div>
              <h2>{project.name}</h2>
              <p>{project.language === 'auto' ? 'Automatic language' : languageNames[project.language]} · {project.takeIds.length
                ? `${project.takeIds.length} saved ${project.takeIds.length === 1 ? 'take' : 'takes'}` : 'Draft'}</p>
              <small>Updated {dateFormat.format(new Date(project.updatedAt))}</small>
            </div>
            <button aria-label={`Open ${project.name}`} type="button" disabled={disabled} onClick={() => onOpen(project.id)}>
              Open <ArrowRight size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
