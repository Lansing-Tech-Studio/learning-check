import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** App wordmark. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-display font-bold ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-choice-3 text-ink-900">
        ✓
      </span>
      <span>
        Learning<span className="text-brand-400">Check</span>
      </span>
    </Link>
  )
}

/** Centered page shell with the branded header. */
export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Wordmark className="text-lg" />
        <span className="pill">Lansing Tech Studio</span>
      </header>
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-5 pb-10 sm:px-8 ${
          wide ? 'max-w-6xl' : 'max-w-xl'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
