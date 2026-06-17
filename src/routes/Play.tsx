import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import { auth } from '../firebase'
import { Shell } from '../components/Shell'
import { AnswerTiles } from '../components/AnswerTiles'
import { Leaderboard } from '../components/Leaderboard'
import { CountdownRing } from '../components/CountdownRing'
import { ChoiceShape } from '../components/choices'
import { useAuthUser, usePlayers, useSession } from '../lib/hooks'
import { moderateNickname } from '../lib/moderation'
import { joinSession, submitAnswer } from '../lib/session'
import { isGeneratedName, randomName } from '../lib/names'

export function Play() {
  const params = useParams()
  const user = useAuthUser()
  const [code, setCode] = useState((params.code ?? '').toUpperCase())
  const [joined, setJoined] = useState(false)

  // Students are anonymous — sign them in silently on first load.
  useEffect(() => {
    if (user === null) signInAnonymously(auth).catch(() => {})
  }, [user])

  if (user === undefined || user === null) {
    return <Centered>Connecting…</Centered>
  }
  if (!joined) {
    return <JoinForm initialCode={code} uid={user.uid} onJoined={(c) => { setCode(c); setJoined(true) }} />
  }
  return <PlayRound code={code} uid={user.uid} />
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <div className="grid flex-1 place-items-center text-slate-400">{children}</div>
    </Shell>
  )
}

function JoinForm({
  initialCode,
  uid,
  onJoined,
}: {
  initialCode: string
  uid: string
  onJoined: (code: string) => void
}) {
  const [code, setCode] = useState(initialCode)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionPreview = useSession(code.trim().toUpperCase())
  const randomNamesOnly = !!sessionPreview?.randomNamesOnly

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    setLoading(true)
    setError(null)
    try {
      const moderated = await moderateNickname(nickname)
      if (!moderated.allowed) {
        setError(moderated.reason)
        return
      }

      if (randomNamesOnly && !isGeneratedName(moderated.nickname)) {
        setError('This quiz only allows randomly generated names.')
        return
      }

      await joinSession(clean, uid, moderated.nickname)
      onJoined(clean)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col justify-center gap-6 py-8">
        <h1 className="text-center font-display text-3xl font-bold">Join the quiz</h1>
        <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-6">
          <div>
            <label htmlFor="code" className="text-sm font-semibold text-slate-300">
              Join code
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC23"
              maxLength={6}
              autoComplete="off"
              className="input mt-1 text-center font-display text-2xl tracking-[0.3em]"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="nick" className="text-sm font-semibold text-slate-300">
                Your nickname
              </label>
              <button
                type="button"
                onClick={async () => {
                  for (let attempt = 0; attempt < 5; attempt++) {
                    const candidate = randomName()
                    const moderated = await moderateNickname(candidate)
                    if (moderated.allowed) {
                      setNickname(moderated.nickname)
                      setError(null)
                      return
                    }
                  }
                  setError('Could not find a safe random nickname. Try typing your own.')
                }}
                className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                🎲 Random
              </button>
            </div>
            <input
              id="nick"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. PixelNinja"
              maxLength={20}
              autoComplete="off"
              className="input mt-1"
              readOnly={randomNamesOnly}
              required
            />
            {randomNamesOnly && (
              <p className="mt-2 text-xs text-slate-400">
                This host requires generated names. Use the random button.
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary text-lg" disabled={loading || !code.trim() || !nickname.trim()}>
            {loading ? 'Joining…' : "Let's go →"}
          </button>
          {error && <p className="text-sm text-choice-0">{error}</p>}
        </form>
      </div>
    </Shell>
  )
}

function PlayRound({ code, uid }: { code: string; uid: string }) {
  const session = useSession(code)
  const players = usePlayers(code)
  const [wasPresent, setWasPresent] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [pickedIndex, setPickedIndex] = useState<number | null>(null)

  // Reset the local selection whenever a new question starts.
  useEffect(() => {
    if (session?.status === 'question') {
      setPicked(null)
      setPickedIndex(session.currentIndex)
    }
  }, [session?.status, session?.currentIndex])

  const me = players.find((p) => p.uid === uid)
  useEffect(() => {
    if (me) setWasPresent(true)
  }, [me])

  if (session === undefined) return <Centered>Loading…</Centered>
  if (session === null) return <Centered>That quiz is no longer available.</Centered>

  if (wasPresent && !me) {
    return (
      <Centered>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold">You were removed from this quiz.</h2>
          <p className="mt-2 text-slate-400">Only the host can add you back.</p>
        </div>
      </Centered>
    )
  }
  if (!me) return <Centered>Loading…</Centered>

  async function pick(choice: number) {
    if (picked != null || !session || session.status !== 'question') return
    setPicked(choice)
    try {
      await submitAnswer(code, uid, session.currentIndex, choice)
    } catch {
      setPicked(null) // allow a retry if the write failed
    }
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col gap-6 py-4">
        {session.status === 'lobby' && (
          <Waiting title={`You're in, ${me?.nickname ?? ''}!`} subtitle="Hang tight — the quiz starts soon." />
        )}

        {session.status === 'question' && session.currentQuestion && pickedIndex === session.currentIndex && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="pill-progress">
                Question {session.currentIndex + 1} of {session.questionCount}
              </span>
              {session.questionStartedAt && (
                <CountdownRing
                  startedAt={session.questionStartedAt}
                  seconds={session.currentQuestion.timeLimit}
                  size={64}
                />
              )}
            </div>
            <h2 className="font-display text-2xl font-bold">{session.currentQuestion.prompt}</h2>
            {picked == null ? (
              <AnswerTiles choices={session.currentQuestion.choices} onPick={pick} selected={picked} />
            ) : (
              <Locked choice={picked} label={session.currentQuestion.choices[picked]} />
            )}
          </div>
        )}

        {session.status === 'reveal' && session.revealedCorrectIndex != null && (
          <RevealResult
            correct={picked != null && picked === session.revealedCorrectIndex}
            answered={picked != null}
            score={me.score}
          />
        )}

        {session.status === 'ended' && (
          <div className="flex flex-1 flex-col items-center gap-6">
            <h2 className="font-display text-3xl font-bold">That's a wrap! 🎉</h2>
            <div className="card w-full p-2">
              <Leaderboard players={players} highlightUid={uid} podium />
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Waiting({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="grid flex-1 place-items-center text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-brand-400" />
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function Locked({ choice, label }: { choice: number; label: string }) {
  return (
    <div className="grid flex-1 place-items-center text-center">
      <div className="flex flex-col items-center gap-3 animate-pop-in">
        <ChoiceShape index={choice} className="h-12 w-12 text-brand-400" />
        <h2 className="font-display text-2xl font-bold">Locked in!</h2>
        <p className="text-slate-400">
          You answered “{label}”. Waiting for everyone else…
        </p>
      </div>
    </div>
  )
}

function RevealResult({ correct, answered, score }: { correct: boolean; answered: boolean; score: number }) {
  return (
    <div className="grid flex-1 place-items-center text-center">
      <div className="flex flex-col items-center gap-4 animate-pop-in">
        <div
          className={`grid h-24 w-24 place-items-center rounded-full text-5xl ${
            correct ? 'bg-choice-3/20 text-choice-3' : 'bg-choice-0/20 text-choice-0'
          }`}
        >
          {correct ? '✓' : answered ? '✕' : '—'}
        </div>
        <h2 className="font-display text-3xl font-bold">
          {correct ? 'Correct!' : answered ? 'Not quite' : 'No answer'}
        </h2>
        <p className="text-slate-400">Look up at the screen for the breakdown.</p>
        <div className="rounded-2xl bg-white/5 px-6 py-3">
          <span className="text-sm text-slate-400">Your score</span>
          <p className="font-display text-3xl font-bold text-brand-400">{score.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
