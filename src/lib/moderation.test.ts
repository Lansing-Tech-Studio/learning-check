import { describe, expect, it } from 'vitest'
import {
  MAX_NICKNAME_LENGTH,
  localNicknameModerationProvider,
  moderateNickname,
} from './moderation'
import { isGeneratedName } from './names'

describe('moderateNickname', () => {
  it('normalizes extra whitespace', async () => {
    const result = await moderateNickname('   Pixel    Ninja   ')
    expect(result).toEqual({ allowed: true, nickname: 'Pixel Ninja' })
  })

  it('blocks empty nicknames', async () => {
    const result = await moderateNickname('   ')
    expect(result.allowed).toBe(false)
  })

  it('blocks overly long nicknames', async () => {
    const result = await moderateNickname('x'.repeat(MAX_NICKNAME_LENGTH + 1))
    expect(result.allowed).toBe(false)
  })

  it('blocks disallowed characters', async () => {
    const result = await moderateNickname('Quiz🔥Kid')
    expect(result.allowed).toBe(false)
  })

  it('blocks profanity and simple obfuscation', async () => {
    const direct = await moderateNickname('fuck')
    const obfuscated = await moderateNickname('f_u c-k')

    expect(direct.allowed).toBe(false)
    expect(obfuscated.allowed).toBe(false)
  })

  it('supports provider injection for future remote moderation', async () => {
    const result = await moderateNickname('AnyName', {
      evaluate: async () => ({ allowed: false, reason: 'blocked by remote' }),
    })

    expect(result).toEqual({ allowed: false, reason: 'blocked by remote' })
  })

  it('local provider accepts ordinary classroom names', async () => {
    const result = await localNicknameModerationProvider.evaluate('Clever Otter_7')
    expect(result).toEqual({ allowed: true, nickname: 'Clever Otter_7' })
  })

  it('generated-name matcher recognizes adjective+noun style names', () => {
    expect(isGeneratedName('PixelNinja')).toBe(true)
    expect(isGeneratedName('Pixel Ninja')).toBe(false)
    expect(isGeneratedName('CustomName')).toBe(false)
  })
})
