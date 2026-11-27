import { useCallback, useEffect, useState } from 'react'
import { saveProjects } from './projects'
import type { Projects } from './projects'

const failureMessage = 'This browser could not save your latest changes. Keep this tab open and copy your script before leaving.'

type Result = { projects: Projects; error: string }

/** Only the exact project snapshot written successfully is reported as saved. */
export function useDraftSave(projects: Projects, write: (value: Projects) => void = saveProjects) {
  const [result, setResult] = useState<Result>()
  const retry = useCallback(() => {
    try {
      write(projects)
      setResult({ projects, error: '' })
    } catch {
      setResult({ projects, error: failureMessage })
    }
  }, [projects, write])

  useEffect(() => { retry() }, [retry])

  // A newly edited snapshot has not yet been written, even if the previous one was.
  const current = result?.projects === projects
  return {
    state: !current ? 'saving' as const : result.error ? 'error' as const : 'saved' as const,
    error: current ? result.error : '',
    retry,
  }
}
