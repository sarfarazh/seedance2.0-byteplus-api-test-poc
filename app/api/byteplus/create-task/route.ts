import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BYTEPLUS_BASE } from '@/lib/byteplus';
import { getGlobalSpend, getLimit } from '@/lib/redis';

const schema = z.object({
  payload: z.any(),
  clientId: z.string().optional(),
  clientApiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const p = schema.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { payload, clientId, clientApiKey } = p.data;
  let apiKey: string;

  if (clientApiKey) {
    apiKey = clientApiKey;
  } else {
    const envKey = process.env.BYTEPLUS_API_KEY;
    if (!envKey) return NextResponse.json({ error: 'Server misconfigured: missing BYTEPLUS_API_KEY' }, { status: 500 });
    const spend = await getGlobalSpend('byteplus');
    const limit = getLimit('BYTEPLUS_USD_LIMIT');
    if (spend >= limit) {
      return NextResponse.json({ error: 'BytePlus app budget limit reached', spendUsd: spend, limitUsd: limit, suggestByok: true }, { status: 402 });
    }
    apiKey = envKey;
  }

  const r = await fetch(`${BYTEPLUS_BASE}/contents/generations/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j?.error?.message || 'Create task failed', raw: j }, { status: r.status });
  return NextResponse.json({ ...j, _meta: { byok: !!clientApiKey, clientId } });
}
