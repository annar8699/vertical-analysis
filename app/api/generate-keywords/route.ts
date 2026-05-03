import { NextResponse } from 'next/server'

export const maxDuration = 30

function buildPrompt(url: string, description: string, seeds: string): string {
  return `You are a PPC keyword research specialist. Generate a list of ~50–80 relevant search keywords.

Context:
- Website/domain: ${url.trim() || 'not provided'}
- Business description: ${description.trim() || 'not provided'}
- Seed keywords: ${seeds.trim() || 'not provided'}

Rules:
- One keyword per line, no numbering, no bullets, no extra text
- Mix of broad and long-tail keywords
- Commercial and informational search intent
- Language: match seed keyword language, default to English
- No duplicates
- Return ONLY the keywords, nothing else`
}

// Try models in order until one works
const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
  'gemini-1.0-pro',
]

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI keyword generation is not configured. Add GOOGLE_AI_API_KEY to environment variables.' },
      { status: 400 }
    )
  }

  try {
    const { url = '', description = '', seeds = '' } = await req.json()

    if (!url.trim() && !description.trim() && !seeds.trim()) {
      return NextResponse.json(
        { error: 'Please provide at least one input: URL, description, or seed keywords.' },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(url, description, seeds)
    let lastError = ''

    for (const model of CANDIDATE_MODELS) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const keywords = text
          .split('\n')
          .map((k: string) => k.replace(/^[-•*\d.]+\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 100)
        return NextResponse.json({ keywords })
      }

      const err = await response.json().catch(() => ({}))
      lastError = err?.error?.message ?? `HTTP ${response.status}`

      // Stop retrying on auth errors
      if (response.status === 400 || response.status === 403) break
    }

    return NextResponse.json({ error: lastError }, { status: 500 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
