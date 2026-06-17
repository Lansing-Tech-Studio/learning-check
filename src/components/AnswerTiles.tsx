import { ChoiceShape, choiceStyle } from './choices'

interface Props {
  choices: string[]
  /** The student's locked-in choice, if any. */
  selected?: number | null
  /** Revealed correct index (reveal phase) — dims wrong answers. */
  correctIndex?: number | null
  disabled?: boolean
  onPick?: (index: number) => void
  /** Larger, non-interactive tiles for the host's projected screen. */
  presentation?: boolean
}

/** The grid of large, high-contrast answer buttons. */
export function AnswerTiles({
  choices,
  selected,
  correctIndex,
  disabled,
  onPick,
  presentation,
}: Props) {
  const revealing = correctIndex != null
  return (
    <div className="grid w-full gap-3 sm:gap-4 sm:grid-cols-2">
      {choices.map((choice, i) => {
        const style = choiceStyle(i)
        const isCorrect = revealing && i === correctIndex
        const isSelected = selected === i
        const dim = revealing && !isCorrect

        return (
          <button
            key={i}
            type="button"
            disabled={disabled || presentation}
            onClick={() => onPick?.(i)}
            aria-pressed={isSelected}
            className={[
              style.bg,
              'group relative flex items-center gap-4 rounded-2xl px-5 text-left font-semibold text-white',
              'shadow-lg transition-[opacity,transform,filter,box-shadow] duration-200 ease-out will-change-[opacity,transform]',
              presentation ? 'py-7 text-2xl cursor-default' : 'py-6 text-lg',
              !disabled && !presentation ? 'hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]' : '',
              isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-ink-900' : '',
              dim ? 'opacity-30 saturate-50' : '',
              isCorrect ? 'ring-4 ring-white scale-[1.02]' : '',
            ].join(' ')}
          >
            <ChoiceShape index={i} className={presentation ? 'h-9 w-9 shrink-0' : 'h-7 w-7 shrink-0'} />
            <span className="flex-1">{choice}</span>
            {isCorrect && (
              <span className="absolute right-4 text-2xl" aria-label="correct answer">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
