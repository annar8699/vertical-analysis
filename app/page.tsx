'use client'

import { useState, useCallback } from 'react'
import { TotalTrendChart } from '@/components/TotalTrendChart'
import { TrendBadge } from '@/components/TrendBadge'
import { AggregatedAnalysis } from '@/components/AggregatedAnalysis'
import type { KeywordResult } from '@/lib/trendAnalysis'

const GEOS = [
  { value: 'AT', label: 'Austria' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'HR', label: 'Croatia' },
  { value: 'CY', label: 'Cyprus' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'DK', label: 'Denmark' },
  { value: 'EE', label: 'Estonia' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'GR', label: 'Greece' },
  { value: 'HU', label: 'Hungary' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IT', label: 'Italy' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MT', label: 'Malta' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'NO', label: 'Norway' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'RO', label: 'Romania' },
  { value: 'RS', label: 'Serbia' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'ES', label: 'Spain' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'GB', label: 'United Kingdom' },
]

function downloadCSV(results: KeywordResult[]) {
  const headers = [
    'Keyword',
    'Avg / month',
    'Trend',
    ...results[0].monthlyData.map((m) => m.label),
  ]
  const rows = results.map((r) => [
    r.keyword,
    r.avgVolume,
    r.trend === 'growing' ? 'Growing' : r.trend === 'declining' ? 'Declining' : 'Stable',
    ...r.monthlyData.map((m) => m.volume),
  ])

  const csv = [headers, ...rows].map((row) => row.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vertical-analysis-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Home() {
  const [keywordsText, setKeywordsText] = useState('')
  const [geo, setGeo] = useState('CZ')
  const [months, setMonths] = useState(48)
  const [results, setResults] = useState<KeywordResult[] | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (file.name.endsWith('.csv')) {
        const Papa = (await import('papaparse')).default
        Papa.parse(file, {
          complete: (parsed) => {
            const keywords = (parsed.data as string[][])
              .map((row) => (row[0] ?? '').trim())
              .filter(Boolean)
            setKeywordsText(keywords.join('\n'))
          },
        })
      } else {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
        const keywords = rows.map((row) => String(row[0] ?? '').trim()).filter(Boolean)
        setKeywordsText(keywords.join('\n'))
      }
    } catch {
      setError('Failed to load file. Try CSV or XLSX format.')
    }

    e.target.value = ''
  }, [])

  const handleAnalyze = async () => {
    const keywords = keywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean)

    if (keywords.length === 0) {
      setError('Enter at least one keyword.')
      return
    }

    if (keywords.length > 1000) {
      setError('Maximum 1,000 keywords at a time.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, geo, months }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Chyba při načítání dat.')

      setResults(data.results)
      setIsMock(data.mock)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f5f0' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--maira-green)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1
              className="text-white font-bold uppercase tracking-widest text-lg"
              style={{ letterSpacing: '0.15em' }}
            >
              Vertical Analysis
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Keyword search volume trend analysis
            </p>
          </div>
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--maira-orange)',
              color: '#fff',
              letterSpacing: '0.12em',
            }}
          >
            Maira
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Keywords input */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
          >
            Keywords
          </h2>
          <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>
            Up to 1,000 keywords, one per line
          </p>
          <textarea
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder={'furniture\nsofa\ncustom armchair'}
            className="w-full h-56 px-3 py-2 text-sm border rounded-xl resize-y focus:outline-none font-mono"
            style={{
              borderColor: '#e5e7eb',
              color: '#1f2937',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--maira-orange)')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
          <div className="flex items-center gap-3 mt-3">
            <label
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-lg cursor-pointer transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--maira-orange)'
                ;(e.currentTarget as HTMLLabelElement).style.color = 'var(--maira-orange)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLLabelElement).style.borderColor = '#e5e7eb'
                ;(e.currentTarget as HTMLLabelElement).style.color = '#6b7280'
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload CSV / Excel
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <span className="text-xs" style={{ color: '#d1d5db' }}>
              Column A = keyword list
            </span>
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--maira-green)', letterSpacing: '0.12em' }}
            >
              Market
            </label>
            <select
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none"
              style={{ borderColor: '#e5e7eb', color: '#1f2937' }}
            >
              {GEOS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--maira-green)', letterSpacing: '0.12em' }}
            >
              Period
            </label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none"
              style={{ borderColor: '#e5e7eb', color: '#1f2937' }}
            >
              <option value={48}>Maximum available (4 years)</option>
              <option value={36}>Last 36 months</option>
              <option value={24}>Last 24 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !keywordsText.trim()}
          className="w-full py-3.5 text-white text-sm font-bold uppercase tracking-widest rounded-xl transition-colors disabled:opacity-40"
          style={{
            backgroundColor: loading || !keywordsText.trim() ? '#9ca3af' : 'var(--maira-orange)',
            letterSpacing: '0.12em',
          }}
          onMouseEnter={(e) => {
            if (!loading && keywordsText.trim())
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--maira-orange-hover)'
          }}
          onMouseLeave={(e) => {
            if (!loading && keywordsText.trim())
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--maira-orange)'
          }}
        >
          {loading ? 'Loading data…' : 'Analyze vertical'}
        </button>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {isMock && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                }}
              >
                Sample data is shown. For real data, set Google Ads API credentials in Vercel environment variables.
              </div>
            )}

            {/* Aggregated analysis: volume matrix + YoY + annual chart */}
            <AggregatedAnalysis data={results} />

            {/* Summary cards */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
                  >
                    Keyword Breakdown
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                    Average monthly volume &amp; trend per keyword
                  </p>
                </div>
                <button
                  onClick={() => downloadCSV(results)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--maira-orange)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--maira-orange)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((r) => (
                  <div
                    key={r.keyword}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: '#f9fafb' }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                        {r.keyword}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                        {r.avgVolume.toLocaleString('en')} searches/mo.
                      </p>
                    </div>
                    <TrendBadge trend={r.trend} />
                  </div>
                ))}
              </div>
            </div>

            {/* Total trend chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
              >
                Total Search Volume Trend
              </h2>
              <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
                Sum of all keywords over the full period
              </p>
              <TotalTrendChart data={results} />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--maira-green)' }}>
                  <tr>
                    <th
                      className="text-left px-6 py-3 text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                    >
                      Keyword
                    </th>
                    <th
                      className="text-right px-6 py-3 text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                    >
                      Avg / mo.
                    </th>
                    <th
                      className="text-right px-6 py-3 text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                    >
                      Min.
                    </th>
                    <th
                      className="text-right px-6 py-3 text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                    >
                      Max.
                    </th>
                    <th
                      className="text-center px-6 py-3 text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                    >
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr
                      key={r.keyword}
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
                    >
                      <td className="px-6 py-3 font-semibold" style={{ color: '#111827' }}>
                        {r.keyword}
                      </td>
                      <td className="px-6 py-3 text-right" style={{ color: '#374151' }}>
                        {r.avgVolume.toLocaleString('en')}
                      </td>
                      <td className="px-6 py-3 text-right" style={{ color: '#9ca3af' }}>
                        {Math.min(...r.monthlyData.map((d) => d.volume)).toLocaleString('en')}
                      </td>
                      <td className="px-6 py-3 text-right" style={{ color: '#9ca3af' }}>
                        {Math.max(...r.monthlyData.map((d) => d.volume)).toLocaleString('en')}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <TrendBadge trend={r.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--maira-green)' }}>
        <div
          className="max-w-7xl mx-auto px-6 py-4 text-center text-xs font-medium uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}
        >
          © {new Date().getFullYear()} Maira Team | Performance Marketing
        </div>
      </footer>
    </div>
  )
}
