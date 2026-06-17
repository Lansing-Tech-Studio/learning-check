import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

// Runs against the Firestore emulator (see `npm run test:rules`, which wraps this in
// `firebase emulators:exec`). Verifies the security model: students never see answers,
// only the host drives the quiz, and answers are write-once.

const rulesPath = fileURLToPath(new URL('../firestore.rules', import.meta.url))

const CODE = 'ABC23'
const HOST = 'host-uid'
const STU_A = 'student-a'
const STU_B = 'student-b'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'learning-check-rules-test',
    firestore: { rules: readFileSync(rulesPath, 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(() => testEnv.cleanup())

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Seed a live session at question index 0 with answers + one player + one response.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'sessions', CODE), {
      hostUid: HOST,
      status: 'question',
      currentIndex: 0,
      questionCount: 3,
      randomNamesOnly: false,
    })
    await setDoc(doc(db, 'sessions', CODE, 'private', 'quiz'), {
      hostUid: HOST,
      questions: [{ prompt: 'q', choices: ['a', 'b'], correctIndex: 1 }],
    })
    await setDoc(doc(db, 'sessions', CODE, 'players', STU_A), {
      uid: STU_A,
      nickname: 'A',
      score: 0,
    })
    await setDoc(doc(db, 'sessions', CODE, 'responses', `0_${STU_B}`), {
      uid: STU_B,
      questionIndex: 0,
      choiceIndex: 1,
      answeredAt: 1,
    })
  })
})

const asHost = () => testEnv.authenticatedContext(HOST).firestore()
const asStudentA = () => testEnv.authenticatedContext(STU_A).firestore()
const asAnon = () => testEnv.unauthenticatedContext().firestore()

describe('session document', () => {
  it('blocks unauthenticated reads', async () => {
    await assertFails(getDoc(doc(asAnon(), 'sessions', CODE)))
  })
  it('allows signed-in reads', async () => {
    await assertSucceeds(getDoc(doc(asStudentA(), 'sessions', CODE)))
  })
  it('lets only the host advance the session', async () => {
    await assertFails(updateDoc(doc(asStudentA(), 'sessions', CODE), { status: 'reveal' }))
    await assertSucceeds(updateDoc(doc(asHost(), 'sessions', CODE), { status: 'reveal' }))
  })
})

describe('private quiz (answers)', () => {
  it('hides answers from students', async () => {
    await assertFails(getDoc(doc(asStudentA(), 'sessions', CODE, 'private', 'quiz')))
  })
  it('lets the host read answers', async () => {
    await assertSucceeds(getDoc(doc(asHost(), 'sessions', CODE, 'private', 'quiz')))
  })
})

describe('players', () => {
  it('lets a student create only their own doc at score 0', async () => {
    await assertSucceeds(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'players', STU_A), {
        uid: STU_A,
        nickname: 'A',
        score: 0,
      }),
    )
    // Cannot create someone else's player doc.
    await assertFails(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'players', STU_B), {
        uid: STU_B,
        nickname: 'fake',
        score: 0,
      }),
    )
  })
  it('forbids a student from inflating their own score', async () => {
    await assertFails(updateDoc(doc(asStudentA(), 'sessions', CODE, 'players', STU_A), { score: 9999 }))
  })
  it('lets the host award a score', async () => {
    await assertSucceeds(updateDoc(doc(asHost(), 'sessions', CODE, 'players', STU_A), { score: 800 }))
  })

  it('rejects nickname updates that are whitespace only', async () => {
    await assertFails(updateDoc(doc(asStudentA(), 'sessions', CODE, 'players', STU_A), { nickname: '   ' }))
    await assertFails(updateDoc(doc(asHost(), 'sessions', CODE, 'players', STU_A), { nickname: '   ' }))
  })

  it('rejects nickname updates over 20 characters', async () => {
    await assertFails(
      updateDoc(doc(asHost(), 'sessions', CODE, 'players', STU_A), {
        nickname: 'x'.repeat(21),
      }),
    )
  })

  it('blocks creating a player doc for a removed uid', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sessions', CODE, 'removed', STU_B), {
        uid: STU_B,
        removedAt: 1,
      })
    })

    await assertFails(
      setDoc(doc(testEnv.authenticatedContext(STU_B).firestore(), 'sessions', CODE, 'players', STU_B), {
        uid: STU_B,
        nickname: 'Second Try',
        score: 0,
      }),
    )
  })

  it('enforces generated-style names when randomNamesOnly is true', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'sessions', CODE), { randomNamesOnly: true })
    })

    await assertFails(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'players', STU_A), {
        uid: STU_A,
        nickname: 'Custom Name',
        score: 0,
      }),
    )

    await assertSucceeds(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'players', STU_A), {
        uid: STU_A,
        nickname: 'PixelNinja',
        score: 0,
      }),
    )
  })
})

describe('responses', () => {
  it('lets a student answer the active question once', async () => {
    await assertSucceeds(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'responses', `0_${STU_A}`), {
        uid: STU_A,
        questionIndex: 0,
        choiceIndex: 0,
        answeredAt: 2,
      }),
    )
  })
  it('rejects answering for a different question index', async () => {
    await assertFails(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'responses', `1_${STU_A}`), {
        uid: STU_A,
        questionIndex: 1,
        choiceIndex: 0,
        answeredAt: 2,
      }),
    )
  })
  it('rejects forging another student uid', async () => {
    await assertFails(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'responses', `0_${STU_A}`), {
        uid: STU_B,
        questionIndex: 0,
        choiceIndex: 0,
        answeredAt: 2,
      }),
    )
  })
  it('hides other students answers, but the host can read them', async () => {
    await assertFails(getDoc(doc(asStudentA(), 'sessions', CODE, 'responses', `0_${STU_B}`)))
    await assertSucceeds(getDoc(doc(asHost(), 'sessions', CODE, 'responses', `0_${STU_B}`)))
  })

  it('rejects answers from a uid removed by the host', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'sessions', CODE, 'removed', STU_A), {
        uid: STU_A,
        removedAt: 1,
      })
    })

    await assertFails(
      setDoc(doc(asStudentA(), 'sessions', CODE, 'responses', `0_${STU_A}`), {
        uid: STU_A,
        questionIndex: 0,
        choiceIndex: 1,
        answeredAt: 3,
      }),
    )
  })
})
