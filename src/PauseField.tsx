import { useState } from 'react'

const pauseChoices = [0, 200, 400, 700, 1000]

type Props = {
  label: string
  idLabel?: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  automatic?: boolean
  disabled?: boolean
}

export function PauseField({ label, idLabel = label, value, onChange, automatic, disabled }: Props) {
  const [custom, setCustom] = useState(false)
  const isCustom = custom || (value !== undefined && !pauseChoices.includes(value))
  return (
    <label>{label}
      <select aria-label={idLabel} disabled={disabled}
        value={isCustom ? 'custom' : value ?? (automatic ? 'auto' : 0)}
        onChange={event => {
          const choice = event.target.value
          setCustom(choice === 'custom')
          if (choice === 'custom') onChange(value ?? 0)
          else onChange(choice === 'auto' ? undefined : Number(choice))
        }}>
        {automatic && <option value="auto">Follow delivery</option>}
        {pauseChoices.map(ms => <option key={ms} value={ms}>{ms === 0 ? 'None' : `${ms} ms`}</option>)}
        <option value="custom">Custom</option>
      </select>
      {isCustom && <input type="number" inputMode="numeric" min={0} max={5000} step={1}
        aria-label={`Custom ${idLabel.toLowerCase()} in milliseconds`} disabled={disabled}
        value={value ?? 0} onChange={event => {
          const ms = Number(event.target.value)
          if (Number.isFinite(ms)) onChange(Math.max(0, Math.min(5000, Math.round(ms))))
        }} />}
    </label>
  )
}
