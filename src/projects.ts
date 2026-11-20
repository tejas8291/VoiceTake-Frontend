import type { LanguageChoice, Scene, Voice } from './api'

export const legacyProjectId = '00000000-0000-0000-0000-000000000000'
const storageKey = 'voice-take.projects.v1'

export type Project = {
  id: string
  name: string
  scenes: Scene[]
  language: LanguageChoice
  voice?: Voice
  keepTiming: boolean
  segmentGapMs?: number
  deliveryPreset?: Scene['style']
  takeIds: string[]
  updatedAt: string
  importDraft?: boolean
}

export type Projects = { activeId: string; items: Project[]; voicePresets?: Voice[] }

export function newProject(name: string, scenes: Scene[] = [{ text: '', style: 'auto' }]): Project {
  return {
    id: crypto.randomUUID(), name, scenes, language: 'auto', keepTiming: true,
    takeIds: [], updatedAt: new Date().toISOString(),
  }
}

export function loadProjects(sample: Scene[]): Projects {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const data: Projects = JSON.parse(saved)
      if (Array.isArray(data.items) && data.items.some(project => project.id === data.activeId)) return data
    }
  } catch {
    // The editor can still start when browser storage is unavailable.
  }

  const first = { ...newProject('My first project', sample), id: legacyProjectId }
  try {
    first.takeIds = ['voice-take.previous', 'voice-take.current']
      .map(key => localStorage.getItem(key)).filter((value): value is string => Boolean(value))
  } catch {
    // A restricted browser has no legacy takes to import.
  }
  return {
    activeId: first.id,
    items: [{ ...first, importDraft: first.takeIds.length > 0 }],
  }
}

export function saveProjects(projects: Projects) {
  localStorage.setItem(storageKey, JSON.stringify(projects))
}
