'use client'

import { useState, useCallback } from 'react'
import { VerticalChart } from '@/components/VerticalChart'
import { TrendBadge } from '@/components/TrendBadge'
import type { KeywordResult } from '@/lib/trendAnalysis'

const GEOS = [
  { value: 'CZ', label: 'Česká republika' },
  { value: 'SK', label: 'Slovensko' },
  { value: 'PL', label: 'Polsko' },
  { value: 'DE', label: 'Německo' },
  { value: 'AT', label: 'Rakousko' },
]

function downloadCSV(results: KeywordResult[]) {
  const headers = [
    'Klíčové slovo',
    'Průměr/měs.',
    'Trend',
    ...results[0].monthlyData.map((m) => m.label),
  ]
  const rows = results.map((r) => [
    r.keyword,
    r.avgVolume,
    r.trend === 'growing' ? 'Rostoucí' : r.trend === 'declining' ? 'Klesající' : 'Stabilní',
    ...r.monthlyData.map((m) => m.volume),
  ])

  const csv = [headers, ...rows].map((row) => row.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vertical-analysis.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Home() {
  const [keywordsText, setKeywordsText] = useState('')
  const [geo, setGeo] = useState('CZ')
  const [months, setMonths] = useState(12)
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
      setError('Nepodařilo se načíst soubor. Zkus CSV nebo XLSX formát.')
    }

    e.target.value = ''
  }, [])

  const handleAnalyze = async () => {
    const keywords = keywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean)

    if (keywords.length === 0) {
      setError('Zadej alespoň jedno klíčové slovo.')
      return
    }

    if (keywords.length > 20) {
      setError('Maximum je 20 klíčových slov najednou.')
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
      setError(err instanceof Error ? err.message : 'Neznámá chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Vertical Analysis</h1>
          <p className="text-sm text-slate-500">Analýza vývoje hledanosti klíčových slov</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Keywords input */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-medium text-slate-700 mb-3">
            Klíčová slova{' '}
            <span className="text-slate-400 font-normal">(max. 20, jedno na řádek)</span>
          </h2>
          <textarea
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder={'nábytek\npohovka\nkřeslo na míru'}
            className="w-full h-36 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Nahrát CSV / Excel
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <span className="text-xs text-slate-400">Sloupec A = seznam keywords</span>
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Trh</label>
            <select
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GEOS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Období</label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={12}>Posledních 12 měsíců</option>
              <option value={24}>Posledních 24 měsíců</option>
              <option value={36}>Posledních 36 měsíců</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !keywordsText.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {loading ? 'Načítám data...' : 'Analyzovat vertikálu'}
        </button>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {isMock && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                Zobrazena jsou ukázková data. Pro reálná data nastav Google Ads API credentials v prostředí Vercelu.
              </div>
            )}

            {/* Summary cards */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-slate-700">Přehled</h2>
                <button
                  onClick={() => downloadCSV(results)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.keyword}</p>
                      <p className="text-xs text-slate-500">
                        {r.avgVolume.toLocaleString('cs')} hledání/měs.
                      </p>
                    </div>
                    <TrendBadge trend={r.trend} />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-700 mb-4">Vývoj hledanosti</h2>
              <VerticalChart data={results} />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Klíčové slovo
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Průměr/měs.
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Min.
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Max.
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r) => (
                    <tr key={r.keyword} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-900">{r.keyword}</td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {r.avgVolume.toLocaleString('cs')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-400">
                        {Math.min(...r.monthlyData.map((d) => d.volume)).toLocaleString('cs')}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-400">
                        {Math.max(...r.monthlyData.map((d) => d.volume)).toLocaleString('cs')}
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
      </div>
    </main>
  )
}
