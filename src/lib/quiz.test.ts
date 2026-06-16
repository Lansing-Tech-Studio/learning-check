import { describe, expect, it } from 'vitest'
import { parseQuiz, QuizValidationError, timeLimitFor } from './quiz'

const valid = {
  title: 'Test Quiz',
  defaultTimeLimit: 30,
  questions: [
    { prompt: 'A?', choices: ['x', 'y'], correctIndex: 1 },
    { prompt: 'B?', choices: ['p', 'q', 'r'], correctIndex: 0, timeLimit: 15 },
  ],
}

describe('parseQuiz', () => {
  it('accepts a valid quiz', () => {
    const quiz = parseQuiz(valid)
    expect(quiz.title).toBe('Test Quiz')
    expect(quiz.questions).toHaveLength(2)
  })

  it('rejects a quiz with no questions', () => {
    expect(() => parseQuiz({ title: 'x', questions: [] })).toThrow(QuizValidationError)
  })

  it('rejects a missing title', () => {
    expect(() => parseQuiz({ questions: valid.questions })).toThrow(QuizValidationError)
  })

  it('rejects correctIndex out of range', () => {
    const bad = { title: 'x', questions: [{ prompt: 'q', choices: ['a', 'b'], correctIndex: 5 }] }
    try {
      parseQuiz(bad)
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(QuizValidationError)
      expect((e as QuizValidationError).issues.join(' ')).toContain('out of range')
    }
  })

  it('rejects fewer than two choices', () => {
    const bad = { title: 'x', questions: [{ prompt: 'q', choices: ['only'], correctIndex: 0 }] }
    expect(() => parseQuiz(bad)).toThrow(QuizValidationError)
  })

  it('rejects more than four choices', () => {
    const bad = {
      title: 'x',
      questions: [{ prompt: 'q', choices: ['a', 'b', 'c', 'd', 'e'], correctIndex: 0 }],
    }
    expect(() => parseQuiz(bad)).toThrow(QuizValidationError)
  })
})

describe('timeLimitFor', () => {
  it('uses the per-question limit when present', () => {
    expect(timeLimitFor(parseQuiz(valid), 1)).toBe(15)
  })
  it('falls back to the quiz default', () => {
    expect(timeLimitFor(parseQuiz(valid), 0)).toBe(30)
  })
  it('falls back to 30 when nothing is set', () => {
    const q = parseQuiz({ title: 'x', questions: [{ prompt: 'q', choices: ['a', 'b'], correctIndex: 0 }] })
    expect(timeLimitFor(q, 0)).toBe(30)
  })
})
