import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BYTEPLUS_BASE } from '@/lib/byteplus';
import { addGlobalSpend, addUserSpend } from '@/lib/redis';
import { estimate } from '@/lib/pricing';

const schema = z.object({
  taskId: z.string().min(1),
  model: z.string().min(1),
  clientId: z.string().optional(),
  clientApiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const p = schema.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { taskId, model, clientId, clientApiKey } = p.data;
  const apiKey = clientApiKey ?? process.env.BYTEPLUS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Server misconfigured: missing BYTEPLUS_API_KEY' }, { status: 500 });

  const r = await fetch(`${BYTEPLUS_BASE}/contents/generations/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j?.error?.message || 'Get task failed', raw: j }, { status: r.status });

  if (j.status === 'succeeded') {
    const totalTokens: number = j.usage?.total_tokens ?? 0;
    const usd = estimate(model, totalTokens).usd;
    let totalSpendUsd = 0;
    if (!clientApiKey) {
      totalSpendUsd = await addGlobalSpend('byteplus', usd);
    }
    if (clientId) {
      await addUserSpend(clientId, 'byteplus', usd);
    }
    return NextResponse.json({ ...j, _spendMeta: { addedUsd: usd, totalSpendUsd, byok: !!clientApiKey } });
  }

  return NextResponse.json(j);
}
