// Scoring: correct answers earn a base score plus a speed bonus that decays over the
// question's time window. Kept pure so it is trivially unit-testable and runs identically
// on the host client for every player.

export const BASE_POINTS = 600
export const MAX_SPEED_BONUS = 400

export interface ScoreInput {
  correct: boolean
  /** ms-since-epoch the question started for the room. */
  questionStartedAt: number
  /** ms-since-epoch the student locked in their answer. */
  answeredAt: number
  /** Question time limit in seconds. */
  timeLimitSeconds: number
}

/**
 * Points for a single answer. Wrong answers score 0. Correct answers score
 * BASE_POINTS plus a linearly-decaying speed bonus: full bonus for an instant answer,
 * zero bonus at the time limit. Always rounded to a whole number.
 */
export function scoreAnswer({
  correct,
  questionStartedAt,
  answeredAt,
  timeLimitSeconds,
}: ScoreInput): number {
  if (!correct) return 0

  const limitMs = Math.max(1, timeLimitSeconds * 1000)
  const elapsed = Math.min(Math.max(answeredAt - questionStartedAt, 0), limitMs)
  const speedFraction = 1 - elapsed / limitMs
  return BASE_POINTS + Math.round(MAX_SPEED_BONUS * speedFraction)
}

/** Count responses per choice index into a fixed-length tally array. */
export function tallyResponses(choiceIndexes: number[], choiceCount: number): number[] {
  const tallies = new Array<number>(choiceCount).fill(0)
  for (const idx of choiceIndexes) {
    if (idx >= 0 && idx < choiceCount) tallies[idx] += 1
  }
  return tallies
}
