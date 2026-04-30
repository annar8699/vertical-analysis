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
  AT: 'geoTargetConstants/2040',
  BE: 'geoTargetConstants/2056',
  BG: 'geoTargetConstants/2100',
  HR: 'geoTargetConstants/2191',
  CY: 'geoTargetConstants/2196',
  CZ: 'geoTargetConstants/2203',
  DK: 'geoTargetConstants/2208',
  EE: 'geoTargetConstants/2233',
  FI: 'geoTargetConstants/2246',
  FR: 'geoTargetConstants/2250',
  DE: 'geoTargetConstants/2276',
  GR: 'geoTargetConstants/2300',
  HU: 'geoTargetConstants/2348',
  IE: 'geoTargetConstants/2372',
  IT: 'geoTargetConstants/2380',
  LV: 'geoTargetConstants/2428',
  LT: 'geoTargetConstants/2440',
  LU: 'geoTargetConstants/2442',
  MT: 'geoTargetConstants/2470',
  NL: 'geoTargetConstants/2528',
  NO: 'geoTargetConstants/2578',
  PL: 'geoTargetConstants/2616',
  PT: 'geoTargetConstants/2620',
  RO: 'geoTargetConstants/2642',
  SK: 'geoTargetConstants/2703',
  SI: 'geoTargetConstants/2705',
  ES: 'geoTargetConstants/2724',
  SE: 'geoTargetConstants/2752',
  CH: 'geoTargetConstants/2756',
  GB: 'geoTargetConstants/2826',
  RS: 'geoTargetConstants/2688',
  UA: 'geoTargetConstants/2804',
}

const LANGUAGE_CODES: Record<string, string> = {
  AT: 'languageConstants/1001',
  BE: 'languageConstants/1002',
  BG: 'languageConstants/1020',
  HR: 'languageConstants/1039',
  CY: 'languageConstants/1000',
  CZ: 'languageConstants/1021',
  DK: 'languageConstants/1009',
  EE: 'languageConstants/1043',
  FI: 'languageConstants/1011',
  FR: 'languageConstants/1002',
  DE: 'languageConstants/1001',
  GR: 'languageConstants/1022',
  HU: 'languageConstants/1023',
  IE: 'languageConstants/1000',
  IT: 'languageConstants/1004',
  LV: 'languageConstants/1028',
  LT: 'languageConstants/1029',
  LU: 'languageConstants/1001',
  MT: 'languageConstants/1000',
  NL: 'languageConstants/1010',
  NO: 'languageConstants/1013',
  PL: 'languageConstants/1030',
  PT: 'languageConstants/1014',
  RO: 'languageConstants/1032',
  SK: 'languageConstants/1037',
  SI: 'languageConstants/1038',
  ES: 'languageConstants/1003',
  SE: 'languageConstants/1015',
  CH: 'languageConstants/1001',
  GB: 'languageConstants/1000',
  RS: 'languageConstants/1035',
  UA: 'languageConstants/1036',
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
