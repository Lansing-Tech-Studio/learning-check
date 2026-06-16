import { describe, expect, it } from 'vitest'
import { BASE_POINTS, MAX_SPEED_BONUS, scoreAnswer, tallyResponses } from './scoring'

describe('scoreAnswer', () => {
  const start = 1_000_000

  it('scores 0 for a wrong answer', () => {
    expect(
      scoreAnswer({ correct: false, questionStartedAt: start, answeredAt: start + 1000, timeLimitSeconds: 20 }),
    ).toBe(0)
  })

  it('awards base + full bonus for an instant correct answer', () => {
    expect(
      scoreAnswer({ correct: true, questionStartedAt: start, answeredAt: start, timeLimitSeconds: 20 }),
    ).toBe(BASE_POINTS + MAX_SPEED_BONUS)
  })

  it('awards only the base at the time limit', () => {
    expect(
      scoreAnswer({ correct: true, questionStartedAt: start, answeredAt: start + 20_000, timeLimitSeconds: 20 }),
    ).toBe(BASE_POINTS)
  })

  it('awards roughly half bonus at the halfway point', () => {
    const score = scoreAnswer({
      correct: true,
      questionStartedAt: start,
      answeredAt: start + 10_000,
      timeLimitSeconds: 20,
    })
    expect(score).toBe(BASE_POINTS + MAX_SPEED_BONUS / 2)
  })

  it('clamps answers after the limit to the base score', () => {
    expect(
      scoreAnswer({ correct: true, questionStartedAt: start, answeredAt: start + 999_999, timeLimitSeconds: 20 }),
    ).toBe(BASE_POINTS)
  })
})

describe('tallyResponses', () => {
  it('counts responses per choice', () => {
    expect(tallyResponses([0, 1, 1, 2, 1], 4)).toEqual([1, 3, 1, 0])
  })
  it('ignores out-of-range indexes', () => {
    expect(tallyResponses([0, 9, -1], 2)).toEqual([1, 0])
  })
  it('returns all-zero for no responses', () => {
    expect(tallyResponses([], 3)).toEqual([0, 0, 0])
  })
})
