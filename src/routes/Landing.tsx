import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'

/** Home screen: students join with a code, instructors head to the host console. */
export function Landing() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function onJoin(e: FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean) navigate(`/play/${clean}`)
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Show what you{' '}
            <span className="bg-gradient-to-r from-brand-400 to-choice-3 bg-clip-text text-transparent">
              learned
            </span>
          </h1>
          <p className="mt-3 text-slate-400">
            Live quizzes for Lansing Tech Studio workshops. Grab the code from the screen and jump in.
          </p>
        </div>

        <form onSubmit={onJoin} className="card flex flex-col gap-4 p-6">
          <label htmlFor="code" className="text-sm font-semibold text-slate-300">
            Enter your join code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC23"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            className="input text-center font-display text-3xl tracking-[0.4em]"
          />
          <button type="submit" className="btn-primary text-lg" disabled={!code.trim()}>
            Join quiz →
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          Running the workshop?{' '}
          <button
            onClick={() => navigate('/host')}
            className="font-semibold text-brand-400 underline-offset-4 hover:underline"
          >
            Open the instructor console
          </button>
        </div>
      </div>
    </Shell>
  )
}
