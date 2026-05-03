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

type InputMode = null | 'manual' | 'upload' | 'ai'

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
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vertical-analysis-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>(null)
  const [keywordsText, setKeywordsText] = useState('')
  const [geo, setGeo] = useState('CZ')
  const [months, setMonths] = useState(48)
  const [results, setResults] = useState<KeywordResult[] | null>(null)
  const [sortKey, setSortKey] = useState<'keyword' | 'avg' | 'min' | 'max' | 'trend' | null>(null)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['growing', 'stable', 'declining']))
  const [isMock, setIsMock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI generation state
  const [aiUrl, setAiUrl] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [aiSeeds, setAiSeeds] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

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
      // After loading, switch to manual mode so user sees the editable textarea
      setInputMode('manual')
    } catch {
      setError('Failed to load file. Try CSV or XLSX format.')
    }

    e.target.value = ''
  }, [])

  const handleGenerateKeywords = async () => {
    setAiLoading(true)
    setAiError(null)

    try {
      const res = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: aiUrl, description: aiDescription, seeds: aiSeeds, geo }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Failed to generate keywords.')

      setKeywordsText(data.keywords.join('\n'))
      setInputMode('manual')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAnalyze = async () => {
    const keywords = keywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean)

    if (keywords.length === 0) {
      setError('Enter at least one keyword.')
      return
    }

    if (keywords.length > 5000) {
      setError('Maximum 5,000 keywords at a time.')
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

  const TREND_ORDER = { growing: 2, stable: 1, declining: 0 }

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortedResults = results
    ? [...results].sort((a, b) => {
        const mul = sortDir === 'desc' ? -1 : 1
        if (sortKey === 'keyword') return mul * a.keyword.localeCompare(b.keyword)
        if (sortKey === 'avg') return mul * (a.avgVolume - b.avgVolume)
        if (sortKey === 'min')
          return mul * (Math.min(...a.monthlyData.map((d) => d.volume)) - Math.min(...b.monthlyData.map((d) => d.volume)))
        if (sortKey === 'max')
          return mul * (Math.max(...a.monthlyData.map((d) => d.volume)) - Math.max(...b.monthlyData.map((d) => d.volume)))
        if (sortKey === 'trend')
          return mul * (TREND_ORDER[a.trend] - TREND_ORDER[b.trend])
        return 0
      })
    : results

  // Shared input field / textarea focus style handlers
  const focusOrange = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'var(--maira-orange)'
    e.target.style.boxShadow = '0 0 0 3px rgba(255,77,48,0.08)'
  }
  const blurGray = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#e5e7eb'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f5f0' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--maira-green)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => { setInputMode(null); setResults(null); setError(null); setAiError(null) }}
            className="text-left"
          >
            <h1
              className="text-white font-bold uppercase tracking-widest text-lg"
              style={{ letterSpacing: '0.15em' }}
            >
              Vertical Analysis
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Keyword search volume trend analysis
            </p>
          </button>
          <img
            src="/maira-logo.png"
            alt="Maira"
            style={{ height: '32px', width: 'auto' }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-6">

        {/* ── INPUT SECTION ─────────────────────────────────────────── */}

        {/* Landing: 3-block selection (shown when no mode selected and no results yet) */}
        {inputMode === null && !results && (
          <div>
            <div className="mb-6">
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
              >
                How would you like to add keywords?
              </h2>
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                Choose one of the three options below to get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Manual entry */}
              <button
                onClick={() => setInputMode('manual')}
                className="group text-left bg-white rounded-2xl p-6 shadow-sm border-2 transition-all"
                style={{ borderColor: '#e5e7eb' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--maira-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#f3f4f6' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--maira-green)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#111827' }}>Manual entry</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                  Type or paste keywords directly — one per line, up to 1,000 keywords
                </p>
              </button>

              {/* Upload file */}
              <label
                className="group text-left bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer block"
                style={{ borderColor: '#e5e7eb' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--maira-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#f3f4f6' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--maira-green)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#111827' }}>Upload file</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                  Upload a CSV or Excel file — keywords from column A are imported automatically
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* AI keywords */}
              <button
                onClick={() => setInputMode('ai')}
                className="group text-left bg-white rounded-2xl p-6 shadow-sm border-2 transition-all"
                style={{ borderColor: '#e5e7eb' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--maira-orange)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#fff4f2' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--maira-orange)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#111827' }}>
                  Keyword ideas
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                  Enter a URL or seed keywords — get suggestions from Google Keyword Planner
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Back button (shown when a mode is selected) */}
        {inputMode !== null && !results && (
          <button
            onClick={() => { setInputMode(null); setError(null); setAiError(null) }}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: '#9ca3af' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--maira-green)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change input method
          </button>
        )}

        {/* Manual entry */}
        {inputMode === 'manual' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
            >
              Keywords
            </h2>
            <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>
              One keyword per line — up to 5,000
            </p>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder={'furniture\nsofa\ncustom armchair'}
              className="w-full h-56 px-3 py-2 text-sm border rounded-xl resize-y focus:outline-none font-mono transition-all"
              style={{ borderColor: '#e5e7eb', color: '#1f2937' }}
              onFocus={focusOrange}
              onBlur={blurGray}
            />
            <p className="text-xs mt-2" style={{ color: '#d1d5db' }}>
              {keywordsText.split('\n').filter((l) => l.trim()).length} keywords entered
            </p>
          </div>
        )}

        {/* Upload file */}
        {inputMode === 'upload' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
            >
              Upload file
            </h2>
            <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>
              CSV or Excel — keywords must be in column A
            </p>
            <label
              className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
              style={{ borderColor: '#e5e7eb' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--maira-orange)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            >
              <svg className="w-8 h-8 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#d1d5db' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Click to choose a file</span>
              <span className="text-xs mt-1" style={{ color: '#d1d5db' }}>.csv, .xlsx, .xls</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}

        {/* AI generation form */}
        {inputMode === 'ai' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
              >
                Keyword ideas
              </h2>
            </div>
            <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>
              Get keyword suggestions from Google Keyword Planner based on your URL or seed keywords
            </p>

            <div className="space-y-4">
              {/* Market */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Market
                </label>
                <select
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none"
                  style={{ borderColor: '#e5e7eb', color: '#1f2937' }}
                >
                  {GEOS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Website / domain <span className="font-normal" style={{ color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={aiUrl}
                  onChange={(e) => setAiUrl(e.target.value)}
                  placeholder="e.g. yourshop.com"
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none transition-all"
                  style={{ borderColor: '#e5e7eb', color: '#1f2937' }}
                  onFocus={focusOrange}
                  onBlur={blurGray}
                />
              </div>

              {/* Seed keywords */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Seed keywords <span className="font-normal" style={{ color: '#9ca3af' }}>(optional)</span>
                </label>
                <textarea
                  value={aiSeeds}
                  onChange={(e) => setAiSeeds(e.target.value)}
                  placeholder="garden furniture, outdoor sofa, patio table"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-xl resize-y focus:outline-none font-mono transition-all"
                  style={{ borderColor: '#e5e7eb', color: '#1f2937' }}
                  onFocus={focusOrange}
                  onBlur={blurGray}
                />
                <p className="text-xs mt-1" style={{ color: '#d1d5db' }}>Comma or newline separated</p>
              </div>
            </div>

            {aiError && (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}
              >
                {aiError}
              </div>
            )}

            <button
              onClick={handleGenerateKeywords}
              disabled={aiLoading || (!aiUrl.trim() && !aiSeeds.trim())}
              className="mt-5 w-full py-3 text-white text-sm font-bold uppercase tracking-widest rounded-xl transition-colors disabled:opacity-40"
              style={{
                backgroundColor:
                  aiLoading || (!aiUrl.trim() && !aiSeeds.trim())
                    ? '#9ca3af'
                    : 'var(--maira-orange)',
                letterSpacing: '0.12em',
              }}
            >
              {aiLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </span>
              ) : (
                'Generate keywords'
              )}
            </button>
          </div>
        )}

        {/* ── SETTINGS + ANALYZE ────────────────────────────────────── */}

        {(inputMode === 'manual' || (results !== null)) && (
          <>
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
          </>
        )}

        {/* ── RESULTS ───────────────────────────────────────────────── */}
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

            {/* Keyword Breakdown — grouped accordion */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <h2
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
                >
                  Keyword Breakdown
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                  Average monthly volume per keyword, grouped by trend
                </p>
              </div>

              {(
                [
                  { trend: 'growing',  label: 'Growing',  dot: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                  { trend: 'stable',   label: 'Stable',   dot: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
                  { trend: 'declining',label: 'Declining', dot: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                ] as const
              ).map(({ trend, label, dot, bg, border }) => {
                const group = results.filter((r) => r.trend === trend)
                const isOpen = openGroups.has(trend)
                return (
                  <div key={trend} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <button
                      onClick={() => {
                        setOpenGroups((prev) => {
                          const next = new Set(prev)
                          next.has(trend) ? next.delete(trend) : next.add(trend)
                          return next
                        })
                      }}
                      className="w-full flex items-center justify-between px-6 py-3 text-left"
                      style={{ backgroundColor: isOpen ? bg : '#fff' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                        <span className="text-sm font-semibold" style={{ color: '#111827' }}>
                          {label}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: border, color: dot }}
                        >
                          {group.length}
                        </span>
                      </div>
                      <svg
                        className="w-4 h-4 flex-shrink-0 transition-transform"
                        style={{ color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpen && group.length > 0 && (
                      <div className="px-6 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {group
                          .slice()
                          .sort((a, b) => b.avgVolume - a.avgVolume)
                          .map((r) => (
                            <div
                              key={r.keyword}
                              className="flex items-center justify-between p-3 rounded-xl"
                              style={{ backgroundColor: '#f9fafb', border: `1px solid ${border}` }}
                            >
                              <div>
                                <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                                  {r.keyword}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                                  {r.avgVolume.toLocaleString('en')} searches/mo.
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {isOpen && group.length === 0 && (
                      <p className="px-6 pb-4 pt-2 text-xs" style={{ color: '#d1d5db' }}>
                        No keywords in this category.
                      </p>
                    )}
                  </div>
                )
              })}
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
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}>
                  Keyword Detail
                </h2>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--maira-green)' }}>
                  <tr>
                    {(
                      [
                        { key: 'keyword', label: 'Keyword', align: 'left' },
                        { key: 'avg',     label: 'Avg / mo.', align: 'right' },
                        { key: 'min',     label: 'Min.',      align: 'right' },
                        { key: 'max',     label: 'Max.',      align: 'right' },
                        { key: 'trend',   label: 'Trend',     align: 'center' },
                      ] as const
                    ).map(({ key, label, align }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`px-6 py-3 text-xs font-bold uppercase tracking-widest cursor-pointer select-none text-${align}`}
                        style={{ color: sortKey === key ? '#fff' : 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                      >
                        {label}
                        <span className="ml-1 opacity-60">
                          {sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedResults!.map((r, idx) => (
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
