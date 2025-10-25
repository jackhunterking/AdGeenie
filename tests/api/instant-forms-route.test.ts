import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Minimal fetch mock
const originalFetch = global.fetch

describe('Meta Instant Forms API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch as unknown as typeof fetch
  })

  it('proxies list to /api/meta/forms and returns data array', async () => {
    const listHandler = await import('../../app/api/meta/instant-forms/route')

    // Mock downstream call to /api/meta/forms
    ;(fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ forms: [{ id: '1', name: 'Form A' }] }),
    })

    const req = new Request('https://localhost/api/meta/instant-forms?campaignId=cmp_1')
    const res = await listHandler.GET(req as unknown as Request)
    const json = await (res as Response).json()
    expect((res as Response).status).toBe(200)
    expect(json.data).toEqual([{ id: '1', name: 'Form A' }])
  })
})
