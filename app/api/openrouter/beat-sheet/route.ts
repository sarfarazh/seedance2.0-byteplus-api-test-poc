import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OPENROUTER_MODEL, OPENROUTER_URL } from '@/lib/openrouter';
import { addGlobalSpend, addUserSpend } from '@/lib/redis';

const schema = z.object({
  logline: z.string().min(1),
  clientId: z.string().optional(),
  clientApiKey: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert screenwriter. Given a logline, generate a Save the Cat beat sheet with all 15 standard beats: Opening Image, Theme Stated, Set-Up, Catalyst, Debate, Break into Two, B Story, Fun and Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night of the Soul, Break into Three, Finale, Final Image.

Format each beat as:
## [Beat Name]
[2-3 sentences describing this beat in the story]

Be specific to the logline. Write cinematically. No introductory text.`;

const INPUT_RATE = 3 / 1_000_000;
const OUTPUT_RATE = 15 / 1_000_000;

export async function POST(req: NextRequest) {
  const p = schema.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { logline, clientId, clientApiKey } = p.data;
  const apiKey = clientApiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Server misconfigured: missing OPENROUTER_API_KEY' }, { status: 500 });

  const refererHeader = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:3000';
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': refererHeader, 'X-Title': 'Seedance 2.0 PoC' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: logline }] }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j?.error?.message || 'OpenRouter failed', raw: j }, { status: r.status });

  const content = j?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return NextResponse.json({ error: 'No assistant content returned', raw: j }, { status: 502 });

  const promptTokens: number = j?.usage?.prompt_tokens ?? 0;
  const completionTokens: number = j?.usage?.completion_tokens ?? 0;
  const usd = promptTokens * INPUT_RATE + completionTokens * OUTPUT_RATE;
  if (usd > 0) {
    const trackSpend = async () => {
      if (!clientApiKey) await addGlobalSpend('openrouter', usd);
      if (clientId) await addUserSpend(clientId, 'openrouter', usd);
    };
    trackSpend().catch(e => console.warn('[redis] openrouter spend tracking failed', e));
  }

  return NextResponse.json({ beatSheet: content, usage: j?.usage });
}
