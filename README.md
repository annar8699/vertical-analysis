# Vertical Analysis — Maira Internal Tool

Internal tool for analyzing keyword search volume trends across markets and time periods. Built for the PPC team at Maira.

---

## What it does

1. **Input** — paste keywords manually (up to 1 000) or upload a CSV / Excel file (column A = keyword list)
2. **Fetch** — pulls historical monthly search volumes from Google Ads API (`generateKeywordHistoricalMetrics`) for the selected market and period
3. **Output:**
   - Total search volume table (years × months) + YoY % change table
   - Annual trend chart — one line per year, Jan–Dec on X axis (seasonality comparison)
   - Total search volume trend — area chart over the full timeline
   - Keyword breakdown — collapsible sections by trend (Growing / Stable / Declining)
   - Keyword detail table — sortable by any column
   - CSV export

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + Maira brand tokens |
| Charts | Recharts |
| Fonts | Montserrat (headings) + Inter (body) — Google Fonts |
| CSV parsing | PapaParse |
| Excel parsing | XLSX |
| Deployment | Vercel (auto-deploy from GitHub `main` branch) |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/annar8699/vertical-analysis.git
cd vertical-analysis
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your Google Ads credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer token from Google Ads API Center |
| `GOOGLE_ADS_CLIENT_ID` | OAuth 2.0 Client ID (Google Cloud Console) |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth 2.0 Refresh Token |
| `GOOGLE_ADS_CUSTOMER_ID` | Google Ads customer ID (with or without dashes) |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | MCC account ID where the developer token lives |

> If `GOOGLE_ADS_DEVELOPER_TOKEN` is not set, the app runs with mock data automatically.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

The app is connected to GitHub. Every push to `main` triggers an automatic deploy.

To update environment variables: Vercel Dashboard → Project → Settings → Environment Variables.

```bash
# Check deployment logs
vercel logs

# Inspect current deployment
vercel inspect
```

---

## Google Ads API

- **Endpoint:** `generateKeywordHistoricalMetrics` (v21)
- **Auth:** OAuth 2.0 with refresh token
- **Data range:** up to 48 months of historical monthly data (controlled by `historicalMetricsOptions.yearMonthRange`)
- **Limit:** 1 000 keywords per request (Google Ads API supports up to 10 000)
- **Account hierarchy:** PROFICIO Marketing MCC → MCC MAIRA → client accounts

The `login-customer-id` header must be set to the MCC where the developer token was issued (PROFICIO Marketing).

---

## How trend is calculated

Each keyword gets a trend badge based on **YoY comparison**:

- Average of the **last 12 months** vs. average of the **previous 12 months**
- **Growing** → YoY change > +5 %
- **Declining** → YoY change < −5 %
- **Stable** → within ±5 %
- **Fallback to Stable** if fewer than 24 months of data are available

---

## Project structure

```
app/
  page.tsx                  Main page (input + results)
  layout.tsx                Root layout (fonts, metadata)
  globals.css               Maira brand CSS variables
  api/
    keywords/route.ts       API route — calls Google Ads or returns mock data

components/
  AggregatedAnalysis.tsx    Volume matrix + YoY table + annual trend chart
  TotalTrendChart.tsx       Area chart — total volume over full timeline
  VerticalChart.tsx         Per-keyword line chart (used in detail view)
  TrendBadge.tsx            Growing / Stable / Declining badge

lib/
  googleAds.ts              Google Ads API client (OAuth + fetch)
  trendAnalysis.ts          Types, trend calculation, month label formatting
  mockData.ts               Deterministic mock data for development
```

---

## Brand

Colors and typography follow [Maira Brand Guidelines](./MAIRA_Brand_Guidelines.md).

| Token | Value |
|---|---|
| `--maira-orange` | `#FF4D30` |
| `--maira-green` | `#0A2B1D` |
| Heading font | Montserrat Extra Bold, uppercase |
| Body font | Inter Regular |
