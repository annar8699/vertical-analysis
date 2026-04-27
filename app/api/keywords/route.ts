import { NextRequest, NextResponse } from 'next/server'
import { generateMockResults } from '@/lib/mockData'

const USE_MOCK = !process.env.GOOGLE_ADS_DEVELOPER_TOKEN

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const keywords: string[] = body.keywords
    const geo: string = body.geo ?? 'CZ'
    const months: number = body.months ?? 12

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'Chybí klíčová slova.' }, { status: 400 })
    }

    if (keywords.length > 20) {
      return NextResponse.json({ error: 'Maximum je 20 klíčových slov najednou.' }, { status: 400 })
    }

    const results = USE_MOCK
      ? generateMockResults(keywords, months)
      : await (await import('@/lib/googleAds')).fetchKeywordVolumes(keywords, geo, months)

    return NextResponse.json({ results, mock: USE_MOCK })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Interní chyba serveru.' },
      { status: 500 }
    )
  }
}
