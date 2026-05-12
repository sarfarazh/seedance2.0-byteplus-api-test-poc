import { NextResponse } from 'next/server';
import { getGlobalSpend, getLimit } from '@/lib/redis';

export async function GET() {
  const byteplusSpend = await getGlobalSpend('byteplus');
  const byteplusLimit = getLimit('BYTEPLUS_USD_LIMIT');

  let openrouterResult: { data: unknown } | { error: string };
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) {
    openrouterResult = { error: 'Missing OPENROUTER_API_KEY' };
  } else {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${orKey}` },
        cache: 'no-store',
      });
      const j = await r.json();
      openrouterResult = r.ok ? { data: j.data } : { error: j?.error?.message || 'OpenRouter key info failed' };
    } catch (e) {
      openrouterResult = { error: e instanceof Error ? e.message : 'Network error' };
    }
  }

  return NextResponse.json({
    byteplus: {
      spendUsd: byteplusSpend,
      limitUsd: byteplusLimit === Infinity ? null : byteplusLimit,
      remainingUsd: byteplusLimit === Infinity ? null : Math.max(0, byteplusLimit - byteplusSpend),
      overLimit: byteplusLimit !== Infinity && byteplusSpend >= byteplusLimit,
    },
    openrouter: openrouterResult,
  });
}
