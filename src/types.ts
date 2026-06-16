// Shared domain types for the Learning Check quiz app.

/** A single quiz question as authored in the workshop JSON (includes the answer). */
export interface QuizQuestion {
  prompt: string
  choices: string[]
  /** Index into `choices` of the correct answer. */
  correctIndex: number
  explanation?: string
  /** Seconds students have to answer; falls back to the quiz `defaultTimeLimit`. */
  timeLimit?: number
}

/** A full quiz as authored in the workshop JSON file fetched from a URL. */
export interface Quiz {
  title: string
  workshop?: string
  description?: string
  defaultTimeLimit?: number
  questions: QuizQuestion[]
}

/** Lifecycle of a live session, driven by the host. */
export type SessionStatus = 'lobby' | 'question' | 'reveal' | 'ended'

/** The public-facing shape of the current question (NEVER includes the answer). */
export interface PublicQuestion {
  prompt: string
  choices: string[]
  timeLimit: number
}

/**
 * Public session document (`sessions/{CODE}`). Readable by everyone in the room.
 * Deliberately omits correct answers until the host reveals them.
 */
export interface SessionDoc {
  hostUid: string
  quizTitle: string
  workshop: string | null
  sourceUrl: string
  status: SessionStatus
  questionCount: number
  currentIndex: number
  currentQuestion: PublicQuestion | null
  /** Set only while `status === 'reveal'`. */
  revealedCorrectIndex: number | null
  /** Per-choice answer counts, written on reveal. */
  currentTallies: number[] | null
  /** ms-since-epoch the current question started (for the countdown + speed scoring). */
  questionStartedAt: number | null
  createdAt: number
}

/** Host-only private quiz document (`sessions/{CODE}/private/quiz`). */
export interface PrivateQuizDoc {
  /** Duplicated here so the doc's security rule is self-contained (no cross-doc get). */
  hostUid: string
  questions: QuizQuestion[]
}

/** A connected student (`sessions/{CODE}/players/{uid}`). */
export interface PlayerDoc {
  uid: string
  nickname: string
  score: number
  joinedAt: number
}

/** A student's answer to one question (`sessions/{CODE}/responses/{index}_{uid}`). */
export interface ResponseDoc {
  uid: string
  questionIndex: number
  choiceIndex: number
  answeredAt: number
}
