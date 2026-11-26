import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { ArrowRight, AudioLines, Captions, ChevronDown, Menu, Mic2, Pause, Play, RotateCcw, X } from 'lucide-react'

const pages = [
  ['/', 'Home'],
  ['/studio', 'Studio'],
  ['/projects', 'Projects'],
  ['/voices', 'Voice library'],
  ['/help', 'Help'],
] as const

type Route = (typeof pages)[number][0]
export type Navigate = (route: Route, event?: MouseEvent<HTMLAnchorElement>) => void

export function useSite() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const page = pages.find(([route]) => route === path)
  useEffect(() => {
    document.title = page?.[0] === '/' ? 'VoiceTake — Voiceovers for short videos'
      : `${page?.[1] || 'Page not found'} — VoiceTake`
  }, [page])

  const navigate: Navigate = (route, event) => {
    if (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) return
    event?.preventDefault()
    if (route === path) return
    window.history.pushState({}, '', route)
    setPath(route)
    window.scrollTo(0, 0)
    requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }))
  }
  return { path, navigate }
}

export function SiteFrame({ path, navigate, children }: {
  path: string
  navigate: Navigate
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const goTo: Navigate = (route, event) => {
    setMenuOpen(false)
    navigate(route, event)
  }

  return (
    <>
      <a className="skip-link" href="#content">Skip to content</a>
      <header className={path === '/' ? 'masthead' : 'masthead workspace-header'}>
        <div className="masthead-inner">
          <a href="/" className="identity" onClick={event => goTo('/', event)}>
            <span className="logo"><AudioLines size={21} aria-hidden="true" /></span> VoiceTake
          </a>
          <button type="button" className="nav-toggle" aria-expanded={menuOpen} aria-controls="site-navigation"
            onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
            Menu
          </button>
          <nav id="site-navigation" className={menuOpen ? 'site-nav is-open' : 'site-nav'}
            aria-label="Main navigation" onKeyDown={event => {
              if (event.key === 'Escape' && menuOpen) {
                setMenuOpen(false)
                document.querySelector<HTMLButtonElement>('.nav-toggle')?.focus()
              }
            }}>
            {pages.map(([url, label]) => (
              <a key={url} href={url} aria-current={path === url ? 'page' : undefined}
                onClick={event => goTo(url, event)}>{label}</a>
            ))}
          </nav>
        </div>
      </header>
      <main id="content" className={path === '/' ? 'home-page' : path === '/studio' ? 'studio-page' : undefined}>{children}</main>
      {path === '/' && <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <a href="/" className="identity" onClick={event => goTo('/', event)}>
              <span className="logo"><AudioLines size={21} aria-hidden="true" /></span> VoiceTake
            </a>
            <p>A voiceover studio for short videos.</p>
          </div>
          <nav aria-label="Footer product links">
            <h2>Product</h2>
            <a href="/studio" onClick={event => goTo('/studio', event)}>Studio</a>
            <a href="/projects" onClick={event => goTo('/projects', event)}>Projects</a>
            <a href="/voices" onClick={event => goTo('/voices', event)}>Voice Library</a>
          </nav>
          <nav aria-label="Footer support links">
            <h2>Support</h2>
            <a href="/help" onClick={event => goTo('/help', event)}>Help center</a>
          </nav>
        </div>
      </footer>}
    </>
  )
}

export function Home({ navigate }: { navigate: Navigate }) {
  const [motionPaused, setMotionPaused] = useState(false)
  return (
    <>
      <section className="home-voice-hero" aria-labelledby="page-title" data-motion={motionPaused ? 'paused' : 'running'}>
        <div className="home-hero-art" aria-hidden="true" />
        <svg className="home-ambient-waves" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g className="home-wave-mint"><path d="M-40 250 C130 250 160 105 310 155 S510 330 670 225 S870 90 1040 190" /></g>
          <g className="home-wave-gold"><path d="M-40 215 C150 320 260 295 400 205 S620 100 760 170 S900 295 1040 225" /></g>
          <g className="home-wave-fine"><path d="M-40 235 C110 180 210 290 360 235 S570 145 730 225 S920 260 1040 200" /></g>
        </svg>
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <h1 id="page-title" tabIndex={-1}>Give your script a voice.</h1>
            <p>Har kahani ke liye ek awaaz.</p>
            <div className="home-hero-actions">
              <a className="home-hero-cta" href="/studio" onClick={event => navigate('/studio', event)}>
                Create a voiceover <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a className="home-hero-link" href="/voices" onClick={event => navigate('/voices', event)}>Explore voices</a>
            </div>
          </div>
        </div>
        <button type="button" className="home-motion-toggle" aria-pressed={motionPaused}
          onClick={() => setMotionPaused(value => !value)}>
          {motionPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          {motionPaused ? 'Resume motion' : 'Pause motion'}
        </button>
      </section>
      <section className="landing-features" aria-labelledby="features-title">
        <h2 id="features-title">Built for your next edit</h2>
        <div className="feature-grid">
        <section><Mic2 aria-hidden="true" /><h2>Your own voice</h2><p>Record or upload a sample to create a private narrator for future voiceovers.</p></section>
        <section><RotateCcw aria-hidden="true" /><h2>Retake one line</h2><p>Fix a word or change a delivery while keeping the rest of your audio in place.</p></section>
        <section><Captions aria-hidden="true" /><h2>Ready for your edit</h2><p>Download your take as WAV with an SRT caption file timed to the audio.</p></section>
        </div>
      </section>
      <section className="landing-workflow" aria-labelledby="workflow-title">
        <div>
          <h2 id="workflow-title">From script to voiceover</h2>
          <p>Try a take in English, Hindi, or Hinglish.</p>
        </div>
        <ol>
          <li><strong>Paste your script</strong><span>Choose a language and set the delivery for each line.</span></li>
          <li><strong>Choose and preview a voice</strong><span>Listen to samples or use your own private voice.</span></li>
          <li><strong>Export your take</strong><span>Download the narration and timed captions for your video.</span></li>
        </ol>
      </section>
    </>
  )
}

export function Help({ navigate }: { navigate: Navigate }) {
  const questions = [
    {
      question: 'Can I use my own voice?',
      answer: <>Yes. In the <a href="/voices" onClick={event => navigate('/voices', event)}>Voice Library</a>, you can record or upload a sample and listen to it before creating a private voice. Voice cloning is available when a voice service is connected.</>,
    },
    {
      question: 'Why do the demo voices sound different?',
      answer: 'The offline presets let you try the editor and exports. Hosted voices use a different speech engine and are the option to try for more expressive delivery.',
    },
    {
      question: 'Can I mix Hindi and English in one script?',
      answer: 'Yes. Choose Hinglish in the Studio. With local voices, write Hindi words in देवनागरी and English words in Latin script.',
    },
    {
      question: 'Can I fix one line after generating?',
      answer: 'Yes. Edit the line and choose Retake line. Keep the timing option on if later lines need to stay in sync with your video.',
    },
    {
      question: 'What can I download?',
      answer: 'Download your narration as a WAV file and your timed captions as an SRT file. Import both into your video editor.',
    },
  ]

  return (
    <section className="help-page" aria-labelledby="page-title">
      <header className="help-heading">
        <h1 id="page-title" tabIndex={-1}>Help center</h1>
      </header>
      <div className="faq">
        {questions.map(({ question, answer }) => (
          <details key={question} name="voice-take-faq">
            <summary>{question}<ChevronDown aria-hidden="true" size={19} /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
