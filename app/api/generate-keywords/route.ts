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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(url, description, seeds) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err?.error?.message ?? `HTTP ${response.status}`
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    const data = await response.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const keywords = text
      .split('\n')
      .map((k: string) => k.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 100)

    return NextResponse.json({ keywords })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
