// Shared visual metadata for answer choices. Up to four choices are supported.

export interface ChoiceStyle {
  /** Tailwind background class. */
  bg: string
  /** Solid hex for any non-Tailwind rendering use-cases. */
  hex: string
  label: string
}

export const CHOICE_STYLES: ChoiceStyle[] = [
  { bg: 'bg-slate-600', hex: '#475569', label: 'A' },
  { bg: 'bg-slate-600', hex: '#475569', label: 'B' },
  { bg: 'bg-slate-600', hex: '#475569', label: 'C' },
  { bg: 'bg-slate-600', hex: '#475569', label: 'D' },
]

export function choiceStyle(index: number): ChoiceStyle {
  return CHOICE_STYLES[index % CHOICE_STYLES.length]
}

/** Letter marker for a choice index (A-D). */
export function ChoiceShape({ index, className = 'h-7 w-7' }: { index: number; className?: string }) {
  const letter = CHOICE_STYLES[index % CHOICE_STYLES.length]?.label ?? 'A'
  return (
    <span className={`${className} inline-flex items-center justify-center font-display font-bold`} aria-hidden="true">
      {letter}
    </span>
  )
}
