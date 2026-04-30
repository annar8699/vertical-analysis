import { MonthlyVolume, KeywordResult, formatMonthLabel, calculateTrend, calcAvg } from './trendAnalysis'

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
        if (a.year !== b.year) return (a.year as number) - (b.year as number)
        return (a.month as number) - (b.month as number)
      })
      .slice(-months)

    const monthlyData: MonthlyVolume[] = sorted.map((m) => ({
      year: m.year as number,
      month: m.month as number,
      volume: (m.monthlySearches as number) ?? 0,
      label: formatMonthLabel(m.year as number, m.month as number),
    }))

    return {
      keyword,
      monthlyData,
      avgVolume: calcAvg(monthlyData),
      trend: calculateTrend(monthlyData),
    }
  })
}
