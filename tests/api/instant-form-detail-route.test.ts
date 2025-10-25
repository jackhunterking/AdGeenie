import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalFetch = global.fetch

describe('Meta Instant Form Detail API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch as unknown as typeof fetch
  })

  it('returns form detail JSON passthrough', async () => {
    const { GET } = await import('../../app/api/meta/instant-forms/[id]/route')

    // 1) page access token fetch
    ;(fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'PAGE_TOKEN' }),
    })

    // 2) detail fetch
    ;(fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123', name: 'My Form', questions: [{ type: 'EMAIL' }] }),
    })

    const req = new Request('https://localhost/api/meta/instant-forms/123?campaignId=cmp_1')
    // @ts-expect-error params provided by Next
    const res = await GET(req as unknown as Request, { params: { id: '123' } })
    const json = await (res as Response).json()

    expect((res as Response).status).toBe(200)
    expect(json.id).toBe('123')
    expect(json.name).toBe('My Form')
  })
})
