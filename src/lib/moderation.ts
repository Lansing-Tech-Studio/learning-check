import { Filter } from 'bad-words'

export const MAX_NICKNAME_LENGTH = 20

export interface NicknameModerationAllowed {
  allowed: true
  nickname: string
}

export interface NicknameModerationBlocked {
  allowed: false
  reason: string
}

export type NicknameModerationResult = NicknameModerationAllowed | NicknameModerationBlocked

export interface NicknameModerationProvider {
  evaluate: (nickname: string) => Promise<NicknameModerationResult>
}

const profanityFilter = new Filter()

function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, ' ')
}

function foldForMatch(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function sanitizeForProfanity(text: string): string {
  return foldForMatch(text).replace(/[^a-z0-9]+/g, ' ')
}

function hasOnlyAllowedChars(text: string): boolean {
  return /^[\p{L}\p{N} .,'!?_-]+$/u.test(text)
}

export const localNicknameModerationProvider: NicknameModerationProvider = {
  async evaluate(rawNickname) {
    const nickname = normalizeNickname(rawNickname)

    if (!nickname) {
      return { allowed: false, reason: 'Enter a nickname before joining.' }
    }

    if (nickname.length > MAX_NICKNAME_LENGTH) {
      return {
        allowed: false,
        reason: `Nicknames can be at most ${MAX_NICKNAME_LENGTH} characters.`,
      }
    }

    if (!hasOnlyAllowedChars(nickname)) {
      return {
        allowed: false,
        reason: 'Use letters, numbers, spaces, or basic punctuation only.',
      }
    }

    const profaneReady = sanitizeForProfanity(nickname)
    const compact = profaneReady.replace(/\s+/g, '')

    if (profanityFilter.isProfane(profaneReady) || profanityFilter.isProfane(compact)) {
      return {
        allowed: false,
        reason: 'That nickname is not allowed. Please choose a different one.',
      }
    }

    return { allowed: true, nickname }
  },
}

export async function moderateNickname(
  nickname: string,
  provider: NicknameModerationProvider = localNicknameModerationProvider,
): Promise<NicknameModerationResult> {
  return provider.evaluate(nickname)
}

export class NicknameModerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NicknameModerationError'
  }
}

export async function assertAllowedNickname(nickname: string): Promise<string> {
  const result = await moderateNickname(nickname)
  if (!result.allowed) throw new NicknameModerationError(result.reason)
  return result.nickname
}
