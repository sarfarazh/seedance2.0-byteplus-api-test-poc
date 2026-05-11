'use client';
import { useEffect, useState } from 'react';

export type RunPhase = 'creating' | 'queued' | 'polling' | 'succeeded' | 'failed' | 'cancelled' | 'expired' | 'timeout';

export interface ActiveRun {
  id: string;
  model: string;
  startedAt: number;
  phase: RunPhase;
  taskId?: string;
  pollCount: number;
  lastPollStatus?: string;
  error?: string;
  videoUrl?: string;
}

const PHASE_STYLE: Record<RunPhase, { label: string; pillClass: string }> = {
  creating: { label: 'Creating', pillClass: 'pill-muted' },
  queued: { label: 'Queued', pillClass: 'pill-muted' },
  polling: { label: 'Polling', pillClass: 'pill-amber' },
  succeeded: { label: 'Succeeded', pillClass: 'pill-green' },
  failed: { label: 'Failed', pillClass: 'pill-red' },
  cancelled: { label: 'Cancelled', pillClass: 'pill-red' },
  expired: { label: 'Expired', pillClass: 'pill-red' },
  timeout: { label: 'Timeout', pillClass: 'pill-red' },
};

const isActive = (p: RunPhase) => p === 'creating' || p === 'queued' || p === 'polling';

const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r.toString().padStart(2, '0')}s` : `${r}s`;
};

const shortModel = (m: string) => (m.includes('fast') ? 'Seedance 2.0 fast' : 'Seedance 2.0');

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function PhaseIcon({ phase }: { phase: RunPhase }) {
  if (phase === 'succeeded') return <span className="text-emerald-400 shrink-0">✓</span>;
  return <span className="text-rose-400 shrink-0">✕</span>;
}

export default function GenerationStatus({
  runs,
  suggesting,
  suggestStartedAt,
}: {
  runs: ActiveRun[];
  suggesting: boolean;
  suggestStartedAt?: number;
}) {
  const [now, setNow] = useState(Date.now());
  const anyActive = suggesting || runs.some(r => isActive(r.phase));
  useEffect(() => {
    if (!anyActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyActive]);
  if (!suggesting && runs.length === 0) return null;
  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-sm">Activity</h3>
      {suggesting && (
        <div className="flex items-center gap-2 text-sm">
          <Spinner />
          <span>Generating prompt suggestion…</span>
          {suggestStartedAt && <span className="text-muted text-xs ml-auto tabular">{fmtElapsed(now - suggestStartedAt)}</span>}
        </div>
      )}
      {runs.map(r => {
        const st = PHASE_STYLE[r.phase];
        const active = isActive(r.phase);
        return (
          <div key={r.id} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2 text-sm">
              {active ? <Spinner /> : <PhaseIcon phase={r.phase} />}
              <span className={st.pillClass}>{st.label}</span>
              <span className="text-muted text-xs truncate">{shortModel(r.model)}</span>
              <span className="text-muted text-xs ml-auto shrink-0 tabular">{fmtElapsed(now - r.startedAt)}</span>
            </div>
            {r.taskId && (
              <div className="text-xs text-muted mt-1">
                Task <span className="font-mono">{r.taskId.slice(0, 8)}…</span>
                {r.phase === 'polling' && (
                  <>
                    {' '}
                    · {r.pollCount} {r.pollCount === 1 ? 'poll' : 'polls'}
                    {r.lastPollStatus && (
                      <>
                        {' '}
                        · last status <span className="font-mono">{r.lastPollStatus}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {r.error && <div className="text-xs text-rose-300 mt-1 break-words">{r.error}</div>}
            {r.videoUrl && <video className="w-full rounded mt-2" controls src={r.videoUrl} />}
          </div>
        );
      })}
    </div>
  );
}
