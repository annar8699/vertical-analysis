import { MonthlyVolume, KeywordResult, formatMonthLabel, calculateTrend, calcAvg } from './trendAnalysis'

const MONTH_ENUM: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4,
  MAY: 5, JUNE: 6, JULY: 7, AUGUST: 8,
  SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
}

function parseMonth(m: unknown): number {
  if (typeof m === 'number') return m
  if (typeof m === 'string') return MONTH_ENUM[m.toUpperCase()] ?? 0
  return 0
}

const GEO_TARGETS: Record<string, string> = {
  CZ: 'geoTargetConstants/2203',
  SK: 'geoTargetConstants/2703',
  PL: 'geoTargetConstants/2616',
  DE: 'geoTargetConstants/2276',
  AT: 'geoTargetConstants/2040',
}

const LANGUAGE_CODES: Record<string, string> = {
  CZ: 'languageConstants/1021',
  SK: 'languageConstants/1037',
  PL: 'languageConstants/1030',
  DE: 'languageConstants/1001',
  AT: 'languageConstants/1001',
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('OAuth token refresh selhal. Zkontroluj credentials.')
  const data = await res.json()
  return data.access_token
}

export async function fetchKeywordVolumes(
  keywords: string[],
  geo: string,
  months: number
): Promise<KeywordResult[]> {
  const accessToken = await getAccessToken()
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, '')

  const response = await fetch(
    `https://googleads.googleapis.com/v21/customers/${customerId}:generateKeywordHistoricalMetrics`,
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
        keywords,
        geoTargetConstants: [GEO_TARGETS[geo] ?? GEO_TARGETS.CZ],
        keywordPlanNetwork: 'GOOGLE_SEARCH',
        language: LANGUAGE_CODES[geo] ?? LANGUAGE_CODES.CZ,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Ads API chyba: ${err}`)
  }

  const data = await response.json()

  return (data.results ?? []).map((item: Record<string, unknown>, idx: number) => {
    const keyword = keywords[idx]
    const metrics = item.keywordMetrics as Record<string, unknown> | undefined
    const monthlySearchVolumes = (metrics?.monthlySearchVolumes as Array<Record<string, unknown>>) ?? []

    const sorted = [...monthlySearchVolumes]
      .sort((a, b) => {
        const yearDiff = parseInt(String(a.year ?? 0), 10) - parseInt(String(b.year ?? 0), 10)
        if (yearDiff !== 0) return yearDiff
        return parseMonth(a.month) - parseMonth(b.month)
      })
      .slice(-months)

    const monthlyData: MonthlyVolume[] = sorted.map((m) => {
      const year = parseInt(String(m.year ?? 0), 10)
      const month = parseMonth(m.month)
      const volume = parseInt(String(m.monthlySearches ?? m.monthlySearchVolume ?? 0), 10) || 0
      return { year, month, volume, label: formatMonthLabel(year, month) }
    })

    return {
      keyword,
      monthlyData,
      avgVolume: calcAvg(monthlyData),
      trend: calculateTrend(monthlyData),
    }
  })
}
