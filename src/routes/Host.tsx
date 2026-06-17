import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { Shell } from '../components/Shell'
import { AnswerTiles } from '../components/AnswerTiles'
import { ResultsChart } from '../components/ResultsChart'
import { Leaderboard } from '../components/Leaderboard'
import { CountdownRing } from '../components/CountdownRing'
import { useAuthUser, usePlayers, useSession } from '../lib/hooks'
import { randomName } from '../lib/names'
import { fetchQuiz, QuizValidationError } from '../lib/quiz'
import {
  createSession,
  endSession,
  loadPrivateQuiz,
  removePlayer,
  renamePlayer,
  revealQuestion,
  setRandomNamesOnly,
  showQuestion,
} from '../lib/session'
import type { Quiz } from '../types'

interface HostError {
  message: string
  issues: string[]
}

function toHostError(err: unknown): HostError {
  if (err instanceof QuizValidationError) return { message: err.message, issues: err.issues }
  return { message: err instanceof Error ? err.message : 'Something went wrong.', issues: [] }
}

function parseRandomNamesOnlyParam(value: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === 'random'
}

export function Host() {
  const user = useAuthUser()

  if (user === undefined) return <Centered>Loading…</Centered>
  if (user === null) return <SignIn />
  return <HostConsole />
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <div className="grid flex-1 place-items-center text-slate-400">{children}</div>
    </Shell>
  )
}

function SignIn() {
  const [error, setError] = useState<string | null>(null)
  return (
    <Shell>
      <div className="flex flex-1 flex-col justify-center gap-6 py-10">
        <div className="card flex flex-col items-center gap-5 p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Instructor sign-in</h1>
          <p className="text-slate-400">Sign in to start a quiz for your workshop.</p>
          <button
            className="btn-primary text-lg"
            onClick={() =>
              signInWithPopup(auth, googleProvider).catch((e) =>
                setError(e?.message ?? 'Sign-in failed.'),
              )
            }
          >
            Continue with Google
          </button>
          {error && <p className="text-sm text-choice-0">{error}</p>}
        </div>
      </div>
    </Shell>
  )
}

function HostConsole() {
  const user = useAuthUser()
  const [params, setParams] = useSearchParams()
  const quizUrlParam = params.get('quiz') ?? ''
  const sessionParam = params.get('session') ?? undefined
  const randomNamesOnlyParam = parseRandomNamesOnlyParam(
    params.get('randomNamesOnly') ?? params.get('names'),
  )

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  // Resume an existing session if the URL carries ?session=CODE (e.g. after a refresh).
  const [code, setCode] = useState<string | undefined>(sessionParam)
  const [autoError, setAutoError] = useState<HostError | null>(null)
  const session = useSession(code)
  const players = usePlayers(code)

  const start = useCallback(
    (c: string, q: Quiz) => {
      setCode(c)
      setQuiz(q)
      // Swap the URL to ?session=CODE so a refresh resumes instead of starting a new quiz.
      setParams({ session: c }, { replace: true })
    },
    [setParams],
  )

  // The quiz is held in memory for the host to drive the round. If the host reloads an
  // active session, read back the stored (shuffled) quiz so the answer order matches what
  // students already see.
  const refetching = useRef(false)
  useEffect(() => {
    if (code && session && !quiz && !refetching.current) {
      refetching.current = true
      loadPrivateQuiz(code)
        .then((q) => q && setQuiz(q))
        .catch(() => {})
        .finally(() => (refetching.current = false))
    }
  }, [code, session, quiz])

  // Deep link: /host?quiz=<url> auto-loads the quiz and opens the lobby (exactly once),
  // so an instructor can jump straight here from a workshop slide.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (code || !quizUrlParam || autoStarted.current) return
    autoStarted.current = true
    void (async () => {
      try {
        const raw = await fetchQuiz(quizUrlParam)
        const { code: c, quiz: shuffled } = await createSession(
          auth.currentUser!.uid,
          raw,
          quizUrlParam,
          { randomNamesOnly: randomNamesOnlyParam },
        )
        start(c, shuffled)
      } catch (err) {
        setAutoError(toHostError(err))
      }
    })()
  }, [code, quizUrlParam, randomNamesOnlyParam, start])

  if (!code) {
    // Auto-loading from a deep link: show a spinner until it resolves (or errors).
    if (quizUrlParam && !autoError) return <Centered>Loading quiz…</Centered>
    return (
      <Setup
        onStarted={start}
        userEmail={user?.email ?? ''}
        initialUrl={quizUrlParam}
        initialRandomNamesOnly={randomNamesOnlyParam}
        initialError={autoError}
      />
    )
  }
  if (session === undefined) return <Centered>Loading…</Centered>
  if (session === null) {
    return (
      <Setup
        onStarted={start}
        userEmail={user?.email ?? ''}
        initialUrl=""
        initialRandomNamesOnly={randomNamesOnlyParam}
        initialError={null}
      />
    )
  }

  const advance = (index: number) => quiz && showQuestion(code, quiz, index)

  return (
    <Shell wide>
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="font-display text-xl font-bold">{session.quizTitle}</h1>
          {session.workshop && <p className="text-sm text-slate-400">{session.workshop}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="pill-progress">
            {session.status === 'lobby' && 'Lobby'}
            {session.status === 'question' && `Question ${session.currentIndex + 1} of ${session.questionCount}`}
            {session.status === 'reveal' && `Reveal ${session.currentIndex + 1} of ${session.questionCount}`}
            {session.status === 'ended' && 'Final results'}
          </span>
          <span className="pill">{players.length} joined</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {session.status === 'lobby' && (
            <Lobby
              code={code}
              playerCount={players.length}
              randomNamesOnly={session.randomNamesOnly}
              onToggleRandomNamesOnly={(enabled) => setRandomNamesOnly(code, enabled)}
              canStart={!!quiz}
              onStart={() => advance(0)}
            />
          )}

          {session.status === 'question' && session.currentQuestion && (
            <div className="card flex flex-col items-center gap-6 p-6">
              <div className="flex w-full items-start justify-between gap-4">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  {session.currentQuestion.prompt}
                </h2>
                {session.questionStartedAt && (
                  <CountdownRing
                    startedAt={session.questionStartedAt}
                    seconds={session.currentQuestion.timeLimit}
                  />
                )}
              </div>
              <AnswerTiles choices={session.currentQuestion.choices} presentation />
              <button className="btn-primary text-lg" onClick={() => revealQuestion(code, quiz!, session.currentIndex)}>
                Reveal answer →
              </button>
            </div>
          )}

          {session.status === 'reveal' &&
            session.currentQuestion &&
            session.currentTallies &&
            session.revealedCorrectIndex != null && (
              <div className="card flex flex-col items-center gap-6 p-6">
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  {session.currentQuestion.prompt}
                </h2>
                {session.currentTallies.some((n) => n > 0) ? (
                  <ResultsChart
                    choices={session.currentQuestion.choices}
                    tallies={session.currentTallies}
                    correctIndex={session.revealedCorrectIndex}
                  />
                ) : (
                  // No answers came in (e.g. solo presenter mode) — just highlight the answer.
                  <AnswerTiles
                    choices={session.currentQuestion.choices}
                    correctIndex={session.revealedCorrectIndex}
                    presentation
                  />
                )}
                {quiz?.questions[session.currentIndex]?.explanation && (
                  <p className="max-w-2xl rounded-2xl bg-white/5 px-5 py-3 text-center text-slate-300">
                    {quiz.questions[session.currentIndex].explanation}
                  </p>
                )}
                <div className="flex gap-3">
                  {session.currentIndex + 1 < session.questionCount ? (
                    <button className="btn-primary text-lg" onClick={() => advance(session.currentIndex + 1)}>
                      Next question →
                    </button>
                  ) : (
                    <button className="btn-primary text-lg" onClick={() => endSession(code)}>
                      Finish & show results 🏆
                    </button>
                  )}
                </div>
              </div>
            )}

          {session.status === 'ended' && (
            <div className="card flex flex-col items-center gap-6 p-8">
              <h2 className="font-display text-3xl font-bold">Final results 🏆</h2>
              <div className="w-full max-w-md">
                <Leaderboard players={players} podium />
              </div>
            </div>
          )}
        </div>

        <aside className="lg:w-80 lg:shrink-0">
          <div className="flex flex-col gap-6 lg:sticky lg:top-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                Leaderboard
              </h3>
              <Leaderboard players={players} limit={5} />
            </section>
            <ParticipantManager code={code} players={players} randomNamesOnly={session.randomNamesOnly} />
          </div>
        </aside>
      </div>
    </Shell>
  )
}

function Lobby({
  code,
  playerCount,
  randomNamesOnly,
  onToggleRandomNamesOnly,
  canStart,
  onStart,
}: {
  code: string
  playerCount: number
  randomNamesOnly: boolean
  onToggleRandomNamesOnly: (enabled: boolean) => Promise<void>
  canStart: boolean
  onStart: () => void
}) {
  const joinUrl = `${window.location.origin}/play/${code}`
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policyError, setPolicyError] = useState<string | null>(null)

  async function togglePolicy(enabled: boolean) {
    setPolicyError(null)
    setSavingPolicy(true)
    try {
      await onToggleRandomNamesOnly(enabled)
    } catch (err) {
      setPolicyError(err instanceof Error ? err.message : 'Could not update name policy.')
    } finally {
      setSavingPolicy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Join code</p>
        <p className="font-display text-6xl font-bold tracking-[0.2em] text-brand-400 sm:text-7xl">
          {code}
        </p>
        <p className="text-sm text-slate-500">
          Go to <span className="text-slate-300">{window.location.host}</span> and enter the code
        </p>
        <p className="break-all text-xs text-slate-600">{joinUrl}</p>
      </div>

      <p className="text-center text-sm text-slate-400">
        Name policy: {randomNamesOnly ? 'Random generated names only' : 'Custom names allowed'}
      </p>

      <label className="mx-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <input
          type="checkbox"
          checked={randomNamesOnly}
          onChange={(e) => {
            void togglePolicy(e.target.checked)
          }}
          disabled={savingPolicy}
          className="h-4 w-4 rounded border-white/20 bg-ink-900"
        />
        <span className="text-sm text-slate-200">Random names only</span>
      </label>
      {policyError && <p className="text-center text-sm text-choice-0">{policyError}</p>}

      {playerCount === 0 && <p className="text-center text-slate-500">Waiting for students to join…</p>}

      <button className="btn-primary mx-auto text-lg" onClick={onStart} disabled={!canStart}>
        {playerCount === 0 ? 'Start solo (present answers) →' : 'Start quiz →'}
      </button>
      {!canStart && <p className="text-center text-sm text-slate-500">Loading quiz…</p>}
    </div>
  )
}

function ParticipantManager({
  code,
  players,
  randomNamesOnly,
}: {
  code: string
  players: { uid: string; nickname: string; score: number }[]
  randomNamesOnly: boolean
}) {
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [draftNickname, setDraftNickname] = useState('')
  const [busyUid, setBusyUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startRename(uid: string, currentNickname: string) {
    setError(null)
    setEditingUid(uid)
    setDraftNickname(currentNickname)
  }

  async function saveRename(uid: string) {
    setBusyUid(uid)
    setError(null)
    try {
      await renamePlayer(code, uid, draftNickname)
      setEditingUid(null)
      setDraftNickname('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename player.')
    } finally {
      setBusyUid(null)
    }
  }

  async function onRemove(uid: string, nickname: string) {
    if (!window.confirm(`Remove ${nickname} from this quiz?`)) return
    setBusyUid(uid)
    setError(null)
    try {
      await removePlayer(code, uid)
      if (editingUid === uid) {
        setEditingUid(null)
        setDraftNickname('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove player.')
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <section className="card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
        Participant controls
      </h3>
      <div className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto pr-1">
        {players.map((p) => {
          const isEditing = editingUid === p.uid
          const isBusy = busyUid === p.uid
          return (
            <div key={p.uid} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-100">{p.nickname}</p>
                  <p className="text-xs text-slate-400">Score {p.score.toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs"
                    disabled={isBusy}
                    onClick={() => startRename(p.uid, p.nickname)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn-danger px-3 py-1.5 text-xs"
                    disabled={isBusy}
                    onClick={() => onRemove(p.uid, p.nickname)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {isEditing && (
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void saveRename(p.uid)
                  }}
                >
                  <input
                    value={draftNickname}
                    onChange={(e) => setDraftNickname(e.target.value)}
                    maxLength={20}
                    className="input py-2 text-sm"
                    autoFocus
                  />
                  {randomNamesOnly && (
                    <button
                      type="button"
                      className="btn-ghost px-3 py-2 text-xs"
                      disabled={isBusy}
                      onClick={() => setDraftNickname(randomName())}
                    >
                      🎲 Random
                    </button>
                  )}
                  <button type="submit" className="btn-primary px-3 py-2 text-xs" disabled={isBusy}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-2 text-xs"
                    disabled={isBusy}
                    onClick={() => {
                      setEditingUid(null)
                      setDraftNickname('')
                      setError(null)
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )
        })}
        {players.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
            No participants yet.
          </p>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-choice-0">{error}</p>}
    </section>
  )
}

function Setup({
  onStarted,
  userEmail,
  initialUrl,
  initialRandomNamesOnly,
  initialError,
}: {
  onStarted: (code: string, quiz: Quiz) => void
  userEmail: string
  initialUrl: string
  initialRandomNamesOnly: boolean
  initialError: HostError | null
}) {
  const [url, setUrl] = useState(initialUrl)
  const [randomNamesOnly, setRandomNamesOnly] = useState(initialRandomNamesOnly)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HostError | null>(initialError)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const raw = await fetchQuiz(url.trim())
      const { code, quiz } = await createSession(auth.currentUser!.uid, raw, url.trim(), {
        randomNamesOnly,
      })
      onStarted(code, quiz)
    } catch (err) {
      setError(toHostError(err))
    } finally {
      setLoading(false)
    }
  }

  // A reusable link an instructor can drop on a slide to jump straight into hosting.
  const hostLink = url.trim()
    ? `${window.location.origin}/host?quiz=${encodeURIComponent(url.trim())}&randomNamesOnly=${randomNamesOnly ? '1' : '0'}`
    : ''

  return (
    <Shell>
      <div className="flex flex-1 flex-col justify-center gap-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Start a quiz</h1>
          <button className="text-sm text-slate-500 hover:text-slate-300" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
        <p className="text-sm text-slate-400">Signed in as {userEmail}</p>

        <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-6">
          <label htmlFor="url" className="text-sm font-semibold text-slate-300">
            Quiz URL
          </label>
          <input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://lansingtechstudio.org/workshops/javascript-basics/quiz.json"
            className="input text-base"
            type="url"
            required
          />
          <button type="submit" className="btn-primary text-lg" disabled={loading || !url.trim()}>
            {loading ? 'Loading…' : 'Load quiz & open lobby'}
          </button>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={randomNamesOnly}
              onChange={(e) => setRandomNamesOnly(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-ink-900"
            />
            <span className="text-sm text-slate-200">Require randomly generated student names</span>
          </label>
          {error && (
            <div className="rounded-2xl border border-choice-0/40 bg-choice-0/10 p-4 text-sm text-red-200">
              <p className="font-semibold">{error.message}</p>
              {error.issues.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-red-300">
                  {error.issues.map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>

        {hostLink && <ShareableLink link={hostLink} />}
      </div>
    </Shell>
  )
}

/** Shows a one-click host deep link for the entered quiz, ready to paste on a slide. */
function ShareableLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="card flex flex-col gap-2 p-5">
      <p className="text-sm font-semibold text-slate-300">📎 Slide link</p>
      <p className="text-xs text-slate-500">
        Put this on a workshop slide to jump straight here with the quiz loaded.
      </p>
      <div className="flex gap-2">
        <input readOnly value={link} className="input text-xs" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn-ghost shrink-0 text-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
