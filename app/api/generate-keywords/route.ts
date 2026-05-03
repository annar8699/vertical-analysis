import { NextResponse } from 'next/server'
import { getAccessToken, GEO_TARGETS, LANGUAGE_CODES } from '@/lib/googleAds'

export const maxDuration = 30

const MOCK_KEYWORDS = [
  'online shop', 'buy online', 'best price', 'free shipping', 'discount',
  'sale', 'new collection', 'top rated', 'reviews', 'compare prices',
  'cheap', 'premium quality', 'fast delivery', 'order online', 'in stock',
]

export async function POST(req: Request) {
  const isMock = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN

  try {
    const { url = '', description = '', seeds = '', geo = 'CZ' } = await req.json()

    if (!url.trim() && !description.trim() && !seeds.trim()) {
      return NextResponse.json(
        { error: 'Please provide at least one input: URL, description, or seed keywords.' },
        { status: 400 }
      )
    }

    // Mock mode — return sample keywords
    if (isMock) {
      return NextResponse.json({ keywords: MOCK_KEYWORDS, mock: true })
    }

    const accessToken = await getAccessToken()
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, '')

    // Build seed keywords from seeds field + description words
    const seedList = [
      ...seeds.split(/[\n,]+/).map((k: string) => k.trim()).filter(Boolean),
      ...description.split(/\s+/).slice(0, 5).filter((w: string) => w.length > 3),
    ].slice(0, 20)

    // Choose the right seed type
    const hasUrl = url.trim().length > 0
    const hasSeeds = seedList.length > 0

    let seedField: Record<string, unknown>
    if (hasUrl && hasSeeds) {
      seedField = { keywordAndUrlSeed: { url: url.trim(), keywords: seedList } }
    } else if (hasUrl) {
      seedField = { urlSeed: { url: url.trim() } }
    } else {
      seedField = { keywordSeed: { keywords: seedList } }
    }

    const response = await fetch(
      `https://googleads.googleapis.com/v21/customers/${customerId}/keywordPlanIdeas:generateKeywordIdeas`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          'Content-Type': 'application/json',
          ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
            ? { 'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID }
            : {}),
        },
        body: JSON.stringify({
          ...seedField,
          geoTargetConstants: [GEO_TARGETS[geo] ?? GEO_TARGETS.CZ],
          language: LANGUAGE_CODES[geo] ?? LANGUAGE_CODES.CZ,
          keywordPlanNetwork: 'GOOGLE_SEARCH',
          pageSize: 100,
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err?.error?.message ?? `HTTP ${response.status}`
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    const data = await response.json()

    const keywords: string[] = (data.results ?? [])
      .map((r: Record<string, unknown>) => String(r.text ?? '').trim())
      .filter(Boolean)
      .slice(0, 100)

    return NextResponse.json({ keywords })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
