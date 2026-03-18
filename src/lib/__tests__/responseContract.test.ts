import { describe, it, expect } from 'vitest'

describe('Response Contract Runtime Guard', () => {
  const validate = (res: any) => {
    expect(res).not.toBeUndefined()

    if ('success' in res) {
      expect(res.success).toBe(true)
      expect(res).toHaveProperty('data')
    }

    if ('error' in res) {
      expect(typeof res.error).toBe('string')
    }
  }

  it('valid success response passes', () => {
    validate({ success: true, data: {} })
  })

  it('valid error response passes', () => {
    validate({ error: 'invalid_request' })
  })
})
