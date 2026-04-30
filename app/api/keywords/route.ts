import { NextRequest, NextResponse } from 'next/server'
import { generateMockResults } from '@/lib/mockData'

export const maxDuration = 60

const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const keywords: string[] = body.keywords
    const geo: string = body.geo ?? 'CZ'
    const months: number = body.months ?? 12

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords provided.' }, { status: 400 })
    }

    if (keywords.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1,000 keywords at a time.' }, { status: 400 })
    }

    const results = USE_MOCK
      ? generateMockResults(keywords, months)
      : await (await import('@/lib/googleAds')).fetchKeywordVolumes(keywords, geo, months)

    return NextResponse.json({ results, mock: USE_MOCK })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}
