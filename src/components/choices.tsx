// Each answer choice gets a distinct color AND shape, so the quiz is readable for
// colour-blind students and works on a projector. Up to four choices are supported.

export interface ChoiceStyle {
  /** Tailwind background class. */
  bg: string
  /** Solid hex (for SVG charts). */
  hex: string
  label: string
}

export const CHOICE_STYLES: ChoiceStyle[] = [
  { bg: 'bg-choice-0', hex: '#ef4444', label: 'Triangle' },
  { bg: 'bg-choice-1', hex: '#3b82f6', label: 'Diamond' },
  { bg: 'bg-choice-2', hex: '#f59e0b', label: 'Circle' },
  { bg: 'bg-choice-3', hex: '#22c55e', label: 'Square' },
]

export function choiceStyle(index: number): ChoiceStyle {
  return CHOICE_STYLES[index % CHOICE_STYLES.length]
}

/** The shape glyph for a choice index, drawn in an SVG so it scales crisply. */
export function ChoiceShape({ index, className = 'h-7 w-7' }: { index: number; className?: string }) {
  const common = { fill: 'currentColor' }
  switch (index % 4) {
    case 0: // triangle
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 3l9 16H3z" {...common} />
        </svg>
      )
    case 1: // diamond
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 2l10 10-10 10L2 12z" {...common} />
        </svg>
      )
    case 2: // circle
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" {...common} />
        </svg>
      )
    default: // square
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" {...common} />
        </svg>
      )
  }
}
