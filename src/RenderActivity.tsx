import { useEffect, useRef } from 'react'
import { AudioLines } from 'lucide-react'
import waveform from './assets/rendering-waveform.json'

export function RenderActivity() {
  const container = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const target = container.current
    if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let disposed = false
    let animation: { destroy: () => void } | undefined
    void import('lottie-web/build/player/lottie_light_canvas').then(({ default: lottie }) => {
      if (disposed) return
      animation = lottie.loadAnimation({
        container: target,
        renderer: 'canvas',
        loop: true,
        autoplay: true,
        animationData: structuredClone(waveform),
      })
      target.classList.add('is-animated')
    }).catch(() => {})
    return () => {
      disposed = true
      animation?.destroy()
    }
  }, [])

  return <span className="render-activity" ref={container} aria-hidden="true"><AudioLines size={22} /></span>
}
