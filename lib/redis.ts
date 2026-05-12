import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export function getLimit(envVar: string): number {
  const v = parseFloat(process.env[envVar] ?? '');
  return isFinite(v) && v > 0 ? v : Infinity;
}

export async function getGlobalSpend(service: 'byteplus' | 'openrouter'): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;
    const v = await redis.get<string>(`${service}_spend`);
    return v ? parseFloat(v) : 0;
  } catch (e) {
    console.warn('[redis] getGlobalSpend failed', e);
    return 0;
  }
}

// Returns the new total after incrementing.
export async function addGlobalSpend(service: 'byteplus' | 'openrouter', usd: number): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;
    const result = await redis.incrbyfloat(`${service}_spend`, usd);
    return typeof result === 'number' ? result : parseFloat(result as string);
  } catch (e) {
    console.warn('[redis] addGlobalSpend failed', e);
    return 0;
  }
}

export async function addUserSpend(clientId: string, service: 'byteplus' | 'openrouter', usd: number): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis || !clientId) return;
    const prefix = `user:${clientId}`;
    await Promise.all([
      redis.incrbyfloat(`${prefix}:${service}_spend`, usd),
      redis.incr(`${prefix}:request_count`),
      redis.set(`${prefix}:last_seen`, Date.now()),
    ]);
  } catch (e) {
    console.warn('[redis] addUserSpend failed', e);
  }
}
