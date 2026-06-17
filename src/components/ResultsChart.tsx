import { ChoiceShape } from './choices'

interface Props {
  choices: string[]
  tallies: number[]
  correctIndex: number
}

/** Animated bar chart of how many students picked each answer, correct one highlighted. */
export function ResultsChart({ choices, tallies, correctIndex }: Props) {
  const max = Math.max(1, ...tallies)
  const total = tallies.reduce((a, b) => a + b, 0)

  return (
    <div className="w-full">
      <div className="flex items-end justify-center gap-4 sm:gap-8" style={{ height: 240 }}>
        {choices.map((_, i) => {
          const count = tallies[i] ?? 0
          const heightPct = (count / max) * 100
          const isCorrect = i === correctIndex
          return (
            <div key={i} className="flex h-full w-20 flex-col items-center justify-end gap-2 sm:w-28">
              <span className="font-display text-2xl font-bold tabular-nums">{count}</span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={[
                    isCorrect ? 'bg-emerald-500/80' : 'bg-rose-500/70',
                    'w-full origin-bottom rounded-t-xl animate-grow-bar',
                    isCorrect ? 'ring-4 ring-emerald-200/80 shadow-lg shadow-emerald-900/40' : 'opacity-70',
                  ].join(' ')}
                  style={{ height: `${Math.max(heightPct, 4)}%`, animationDelay: `${i * 80}ms` }}
                />
              </div>
              <div
                className={[
                  'flex items-center gap-1.5',
                  isCorrect ? 'text-emerald-200 opacity-100' : 'text-rose-200 opacity-75',
                ].join(' ')}
              >
                <ChoiceShape index={i} className="h-5 w-5" />
                {isCorrect && <span aria-label="correct">✓</span>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center text-sm text-slate-400">
        {total} {total === 1 ? 'answer' : 'answers'} in
      </p>
    </div>
  )
}
