import { GenerationRecord } from '@/types/app';
import { estimate } from '@/lib/pricing';

// BytePlus token formula: pixels * fps * duration / 1024
// 480p output is roughly 854x480 (16:9) or 480x854 (9:16) — same pixel count.
const PIXELS_PER_FRAME_480P = 480 * 854;
const FPS = 24;

export interface CostEstimate {
  tokensLow: number;
  tokensHigh: number;
  usdLow: number;
  usdHigh: number;
  sampleCount: number;
  source: 'history' | 'formula';
}

const percentile = (sortedAsc: number[], p: number) => {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.max(0, Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p)));
  return sortedAsc[idx];
};

export function estimateGenerationCost(model: string, duration: number, history: GenerationRecord[]): CostEstimate {
  const samples = history
    .filter(h => h.model === model && h.status === 'succeeded' && typeof h.usageTotalTokens === 'number' && h.usageTotalTokens! > 0 && h.duration)
    .map(h => h.usageTotalTokens! / h.duration!)
    .sort((a, b) => a - b);

  if (samples.length >= 2) {
    const p25 = percentile(samples, 0.25);
    const p75 = percentile(samples, 0.75);
    const tLow = Math.round(p25 * duration);
    const tHigh = Math.round(p75 * duration);
    return {
      tokensLow: tLow,
      tokensHigh: tHigh,
      usdLow: estimate(model, tLow).usd,
      usdHigh: estimate(model, tHigh).usd,
      sampleCount: samples.length,
      source: 'history',
    };
  }
  if (samples.length === 1) {
    const tokens = Math.round(samples[0] * duration);
    return {
      tokensLow: tokens,
      tokensHigh: tokens,
      usdLow: estimate(model, tokens).usd,
      usdHigh: estimate(model, tokens).usd,
      sampleCount: 1,
      source: 'history',
    };
  }
  const tokens = Math.round((PIXELS_PER_FRAME_480P * FPS * duration) / 1024);
  return {
    tokensLow: tokens,
    tokensHigh: tokens,
    usdLow: estimate(model, tokens).usd,
    usdHigh: estimate(model, tokens).usd,
    sampleCount: 0,
    source: 'formula',
  };
}
