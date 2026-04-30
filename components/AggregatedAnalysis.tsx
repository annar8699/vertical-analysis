'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { KeywordResult } from '@/lib/trendAnalysis'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEAR_COLORS = ['#e8502a', '#2563eb', '#16a34a', '#9333ea', '#0891b2', '#f59e0b']

function fmt(n: number) {
  return n.toLocaleString('en')
}

function pct(value: number | null) {
  if (value === null) return '–'
  const rounded = Math.round(value * 100)
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

function pctClass(value: number | null) {
  if (value === null) return 'text-gray-300'
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-500'
  return 'text-gray-500'
}

export function AggregatedAnalysis({ data }: { data: KeywordResult[] }) {
  const { matrix, years, chartData, yoyRows, partialYears } = useMemo(() => {
    // Build year → month → total volume
    const matrix: Record<number, Record<number, number>> = {}

    for (const r of data) {
      for (const m of r.monthlyData) {
        if (!matrix[m.year]) matrix[m.year] = {}
        matrix[m.year][m.month] = (matrix[m.year][m.month] ?? 0) + m.volume
      }
    }

    const years = Object.keys(matrix).map(Number).sort()

    // Chart: one point per month, one series per year
    const chartData = MONTH_NAMES.map((name, i) => {
      const month = i + 1
      const point: Record<string, string | number> = { month: name }
      for (const year of years) {
        const v = matrix[year]?.[month]
        if (v !== undefined) point[String(year)] = v
      }
      return point
    })

    // YoY rows — total only from months present in BOTH years
    const yoyRows = years.slice(1).map((curr, i) => {
      const prev = years[i]
      const months = Array.from({ length: 12 }, (_, m) => {
        const p = matrix[prev]?.[m + 1]
        const c = matrix[curr]?.[m + 1]
        if (p === undefined || c === undefined || p === 0) return null
        return (c - p) / p
      })
      const sharedMonths = Array.from({ length: 12 }, (_, m) => m + 1).filter(
        (m) => matrix[prev]?.[m] !== undefined && matrix[curr]?.[m] !== undefined
      )
      const prevShared = sharedMonths.reduce((a, m) => a + (matrix[prev][m] ?? 0), 0)
      const currShared = sharedMonths.reduce((a, m) => a + (matrix[curr][m] ?? 0), 0)
      const total = sharedMonths.length > 0 && prevShared > 0 ? (currShared - prevShared) / prevShared : null
      return { label: `${prev}/${String(curr).slice(2)}`, months, total }
    })

    // Which years have fewer than 12 months of data
    const partialYears = new Set(
      years.filter((y) => Object.keys(matrix[y] ?? {}).length < 12)
    )

    return { matrix, years, chartData, yoyRows, partialYears }
  }, [data])

  if (years.length === 0) return null

  const thStyle = 'text-right px-3 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap'
  const tdStyle = 'px-3 py-2.5 text-right tabular-nums'

  return (
    <div className="space-y-6">
      {/* Total volume table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
          >
            Total Search Volume
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            Sum of all keywords by year &amp; month
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--maira-green)' }}>
              <tr>
                <th
                  className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                >
                  Year
                </th>
                {MONTH_NAMES.map((m) => (
                  <th
                    key={m}
                    className={thStyle}
                    style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}
                  >
                    {m}
                  </th>
                ))}
                <th
                  className={thStyle + ' px-4'}
                  style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {years.map((year, idx) => {
                const total = Object.values(matrix[year] ?? {}).reduce((a, b) => a + b, 0)
                return (
                  <tr key={year} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td className="px-4 py-2.5 font-bold whitespace-nowrap" style={{ color: '#111827' }}>
                      {year}
                      {partialYears.has(year) && (
                        <span className="ml-1.5 text-xs font-normal" style={{ color: '#9ca3af' }}>
                          (partial)
                        </span>
                      )}
                    </td>
                    {Array.from({ length: 12 }, (_, m) => {
                      const v = matrix[year]?.[m + 1]
                      return (
                        <td
                          key={m}
                          className={tdStyle}
                          style={{ color: v === undefined ? '#d1d5db' : '#374151' }}
                        >
                          {v === undefined ? '–' : fmt(v)}
                        </td>
                      )
                    })}
                    <td
                      className={tdStyle + ' px-4 font-semibold'}
                      style={{ color: '#111827' }}
                    >
                      {fmt(total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* YoY table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
          >
            Year-over-Year Change
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            Monthly &amp; annual % change vs. prior year
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--maira-green)' }}>
              <tr>
                <th
                  className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}
                >
                  YoY
                </th>
                {MONTH_NAMES.map((m) => (
                  <th
                    key={m}
                    className={thStyle}
                    style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}
                  >
                    {m}
                  </th>
                ))}
                <th
                  className={thStyle + ' px-4'}
                  style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {yoyRows.map((row, idx) => (
                <tr key={row.label} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td className="px-4 py-2.5 font-bold whitespace-nowrap" style={{ color: '#111827' }}>
                    {row.label}
                    {(partialYears.has(years[idx]) || partialYears.has(years[idx + 1])) && (
                      <span className="ml-1.5 text-xs font-normal" style={{ color: '#9ca3af' }}>
                        *
                      </span>
                    )}
                  </td>
                  {row.months.map((v, m) => (
                    <td key={m} className={`${tdStyle} font-medium ${pctClass(v)}`}>
                      {pct(v)}
                    </td>
                  ))}
                  <td className={`${tdStyle} px-4 font-bold ${pctClass(row.total)}`}>
                    {pct(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {yoyRows.some((_, i) => partialYears.has(years[i]) || partialYears.has(years[i + 1])) && (
        <p className="text-xs -mt-4" style={{ color: '#9ca3af' }}>
          * YoY total calculated only from months available in both years. Partial year = fewer than 12 months of data.
        </p>
      )}

      {/* Annual trend chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: 'var(--maira-green)', letterSpacing: '0.15em' }}
        >
          Annual Search Volume Trend
        </h2>
        <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
          Monthly total across all keywords — year comparison
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'var(--font-montserrat)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'var(--font-montserrat)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `${(v / 1000).toFixed(0)}k`
                  : String(v)
              }
              width={48}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                fontFamily: 'var(--font-montserrat)',
              }}
              formatter={(value: number, name: string) => [fmt(value), name]}
            />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '16px',
                fontFamily: 'var(--font-montserrat)',
              }}
            />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={String(year)}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
