import { z } from 'zod'
import type { Quiz } from '../types'

// Zod schema mirrors the documented quiz JSON format (docs/quiz-schema.md).
const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, 'A question is missing its "prompt".'),
    choices: z
      .array(z.string().trim().min(1, 'Answer choices cannot be empty.'))
      .min(2, 'Each question needs at least 2 choices.')
      .max(4, 'A question can have at most 4 choices.'),
    correctIndex: z.number().int().nonnegative(),
    explanation: z.string().trim().min(1).optional(),
    timeLimit: z.number().int().positive().max(600).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.correctIndex >= q.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctIndex'],
        message: `"correctIndex" ${q.correctIndex} is out of range for ${q.choices.length} choices.`,
      })
    }
  })

export const quizSchema = z.object({
  title: z.string().trim().min(1, 'The quiz needs a "title".'),
  workshop: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  defaultTimeLimit: z.number().int().positive().max(600).optional(),
  questions: z.array(questionSchema).min(1, 'A quiz needs at least one question.'),
})

export class QuizValidationError extends Error {
  readonly issues: string[]
  constructor(message: string, issues: string[]) {
    super(message)
    this.name = 'QuizValidationError'
    this.issues = issues
  }
}

/** Parse + validate raw (already-JSON-parsed) data into a Quiz, or throw a friendly error. */
export function parseQuiz(data: unknown): Quiz {
  const result = quizSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map((i) => {
      const where = i.path.length ? `${i.path.join('.')}: ` : ''
      return `${where}${i.message}`
    })
    throw new QuizValidationError('This quiz file is not valid.', issues)
  }
  return result.data
}

/**
 * Fetch a quiz from a URL and validate it. Throws a friendly Error on any failure
 * (network, non-JSON, or schema). Designed so the host UI can surface a clear message.
 */
export async function fetchQuiz(url: string): Promise<Quiz> {
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error(
      'Could not reach that URL. Check the link, your connection, or that the file allows cross-origin access.',
    )
  }
  if (!res.ok) {
    throw new Error(`The URL returned ${res.status} ${res.statusText}. Double-check the link.`)
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new Error('That URL did not return valid JSON. Make sure it points directly at a .json file.')
  }
  return parseQuiz(json)
}

/** Effective time limit (seconds) for a question, honoring per-question and quiz defaults. */
export function timeLimitFor(quiz: Quiz, index: number): number {
  return quiz.questions[index]?.timeLimit ?? quiz.defaultTimeLimit ?? 30
}
