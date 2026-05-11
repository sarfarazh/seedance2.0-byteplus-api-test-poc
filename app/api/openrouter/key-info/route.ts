import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ apiKey: z.string().min(1) });

export async function POST(req: NextRequest) {
  const p = schema.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const r = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: `Bearer ${p.data.apiKey}` },
    cache: 'no-store',
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j?.error?.message || 'OpenRouter key info failed', raw: j }, { status: r.status });
  return NextResponse.json(j);
}
