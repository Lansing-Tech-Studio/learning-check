import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  PlayerDoc,
  PublicQuestion,
  Quiz,
  ResponseDoc,
  SessionDoc,
} from '../types'
import { scoreAnswer, tallyResponses } from './scoring'
import { shuffleQuiz, timeLimitFor } from './quiz'

// Join codes avoid ambiguous characters (no 0/O, 1/I) so they read cleanly on a projector.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 5

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return code
}

// ---- doc refs ---------------------------------------------------------------

export const sessionRef = (code: string) => doc(db, 'sessions', code)
export const privateQuizRef = (code: string) => doc(db, 'sessions', code, 'private', 'quiz')
export const playersCol = (code: string) => collection(db, 'sessions', code, 'players')
export const playerRef = (code: string, uid: string) => doc(db, 'sessions', code, 'players', uid)
export const responsesCol = (code: string) => collection(db, 'sessions', code, 'responses')
export const responseRef = (code: string, index: number, uid: string) =>
  doc(db, 'sessions', code, 'responses', `${index}_${uid}`)

// ---- public projection ------------------------------------------------------

function publicQuestion(quiz: Quiz, index: number): PublicQuestion {
  const q = quiz.questions[index]
  return { prompt: q.prompt, choices: q.choices, timeLimit: timeLimitFor(quiz, index) }
}

// ---- host actions -----------------------------------------------------------

/**
 * Create a new session in the lobby. The quiz's answer choices are shuffled here so the
 * correct answer's position is randomized per launch. Returns the join code AND the
 * shuffled quiz, which the host must use to drive the round so everyone stays in sync.
 */
export async function createSession(
  hostUid: string,
  rawQuiz: Quiz,
  sourceUrl: string,
): Promise<{ code: string; quiz: Quiz }> {
  const quiz = shuffleQuiz(rawQuiz)

  // Find an unused code (collisions are vanishingly rare at classroom scale).
  let code = randomCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await getDoc(sessionRef(code))
    if (!existing.exists()) break
    code = randomCode()
  }

  const session: SessionDoc = {
    hostUid,
    quizTitle: quiz.title,
    workshop: quiz.workshop ?? null,
    sourceUrl,
    status: 'lobby',
    questionCount: quiz.questions.length,
    currentIndex: -1,
    currentQuestion: null,
    revealedCorrectIndex: null,
    currentTallies: null,
    questionStartedAt: null,
    createdAt: Date.now(),
  }

  const batch = writeBatch(db)
  batch.set(sessionRef(code), { ...session, createdAt: serverTimestamp() })
  // The full quiz (with answers, in shuffled order) lives here, readable only by the host
  // (enforced by rules). hostUid is duplicated so this doc's rule needs no cross-doc lookup
  // (which would fail in this batch since the session doc isn't committed yet).
  batch.set(privateQuizRef(code), { hostUid, quiz })
  await batch.commit()

  return { code, quiz }
}

/**
 * Re-read the host's stored (shuffled) quiz — used when the host reloads an active session,
 * so the answer order matches what students already see. Only the host can read this.
 */
export async function loadPrivateQuiz(code: string): Promise<Quiz | null> {
  const snap = await getDoc(privateQuizRef(code))
  if (!snap.exists()) return null
  return (snap.data() as { quiz: Quiz }).quiz
}

/** Advance to (or start) a question by index. */
export async function showQuestion(code: string, quiz: Quiz, index: number): Promise<void> {
  await updateDoc(sessionRef(code), {
    status: 'question',
    currentIndex: index,
    currentQuestion: publicQuestion(quiz, index),
    revealedCorrectIndex: null,
    currentTallies: null,
    questionStartedAt: Date.now(),
  })
}

/**
 * Reveal the answer for the current question: tally responses, award scores, and publish
 * the correct index + tallies. The host reads responses (rules permit host-only) and
 * computes everything client-side — no Cloud Functions, free-tier friendly.
 */
export async function revealQuestion(code: string, quiz: Quiz, index: number): Promise<void> {
  const question = quiz.questions[index]
  const limit = timeLimitFor(quiz, index)

  const session = (await getDoc(sessionRef(code))).data() as SessionDoc | undefined
  const startedAt = session?.questionStartedAt ?? Date.now()

  const responsesSnap = await getDocs(responsesCol(code))
  const responses = responsesSnap.docs
    .map((d) => d.data() as ResponseDoc)
    .filter((r) => r.questionIndex === index)

  const tallies = tallyResponses(
    responses.map((r) => r.choiceIndex),
    question.choices.length,
  )

  const batch = writeBatch(db)
  for (const r of responses) {
    const gained = scoreAnswer({
      correct: r.choiceIndex === question.correctIndex,
      questionStartedAt: startedAt,
      answeredAt: r.answeredAt,
      timeLimitSeconds: limit,
    })
    if (gained > 0) {
      const player = (await getDoc(playerRef(code, r.uid))).data() as PlayerDoc | undefined
      batch.update(playerRef(code, r.uid), { score: (player?.score ?? 0) + gained })
    }
  }
  batch.update(sessionRef(code), {
    status: 'reveal',
    revealedCorrectIndex: question.correctIndex,
    currentTallies: tallies,
  })
  await batch.commit()
}

/** End the session and show the final leaderboard. */
export async function endSession(code: string): Promise<void> {
  await updateDoc(sessionRef(code), {
    status: 'ended',
    currentQuestion: null,
    revealedCorrectIndex: null,
  })
}

// ---- student actions --------------------------------------------------------

/** Join a session: confirm it exists and register the player. */
export async function joinSession(
  code: string,
  uid: string,
  nickname: string,
): Promise<void> {
  const snap = await getDoc(sessionRef(code))
  if (!snap.exists()) throw new Error('No quiz found for that code. Double-check it and try again.')
  const session = snap.data() as SessionDoc
  if (session.status === 'ended') throw new Error('That quiz has already finished.')

  const player: PlayerDoc = {
    uid,
    nickname: nickname.trim().slice(0, 20),
    score: 0,
    joinedAt: Date.now(),
  }
  await setDoc(playerRef(code, uid), player, { merge: true })
}

/** Submit (lock in) an answer for the current question. Cannot be changed afterwards. */
export async function submitAnswer(
  code: string,
  uid: string,
  questionIndex: number,
  choiceIndex: number,
): Promise<void> {
  const response: ResponseDoc = {
    uid,
    questionIndex,
    choiceIndex,
    answeredAt: Date.now(),
  }
  // create-only (rules forbid updates), so a second tap is rejected — the answer is locked.
  await setDoc(responseRef(code, questionIndex, uid), response)
}
