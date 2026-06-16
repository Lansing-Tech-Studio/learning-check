import { useEffect, useState } from 'react'

interface Props {
  /** ms-since-epoch the question started. */
  startedAt: number
  /** Total seconds for the question. */
  seconds: number
  size?: number
}

/** A circular countdown that drains as the clock runs down. */
export function CountdownRing({ startedAt, seconds, size = 96 }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])

  const total = seconds * 1000
  const elapsed = Math.min(Math.max(now - startedAt, 0), total)
  const remaining = Math.ceil((total - elapsed) / 1000)
  const fraction = total > 0 ? 1 - elapsed / total : 0

  const stroke = 8
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * fraction
  const color = remaining <= 5 ? '#ef4444' : remaining <= 10 ? '#f59e0b' : '#a78bfa'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-display text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {remaining}
      </span>
    </div>
  )
}
