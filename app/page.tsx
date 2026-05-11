'use client';
import { useEffect, useMemo, useState } from 'react';
import Sidebar, { HamburgerButton, SCREEN_TITLE } from '@/components/sidebar';
import GenerationStatus, { ActiveRun, RunPhase } from '@/components/generate/generation-status';
import { AppLog, GenerationRecord, GenerationStatus as GenStatus, ModelChoice, Ratio, Screen, StructuredPrompt } from '@/types/app';
import { storage } from '@/lib/storage';
import { estimate, metrics } from '@/lib/pricing';
import { toStructuredText } from '@/lib/prompt';
import { dt, uid } from '@/lib/utils';

const mapModel = (m: ModelChoice) => (m === 'seedance2' ? 'dreamina-seedance-2-0-260128' : 'dreamina-seedance-2-0-fast-260128');
const SP_LABEL: Record<keyof StructuredPrompt, string> = {
  subject: 'Subject',
  setting: 'Setting',
  action: 'Action',
  camera: 'Camera',
  lightingStyle: 'Lighting / Style',
  audio: 'Audio',
  constraints: 'Constraints',
};
const statusPillClass = (s: GenStatus) => {
  if (s === 'succeeded') return 'pill-green';
  if (s === 'running' || s === 'pending') return 'pill-amber';
  return 'pill-red';
};
const shortModelLabel = (m: string) => (m.includes('fast') ? 'Seedance 2.0 fast' : 'Seedance 2.0');
const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
const fmtNum = (n: number) => n.toLocaleString();

export default function Home() {
  const [screen, setScreen] = useState<Screen>('generate');
  const [open, setOpen] = useState(false);
  const [bp, setBp] = useState('');
  const [or, setOr] = useState('');
  const [showBp, setShowBp] = useState(false);
  const [showOr, setShowOr] = useState(false);
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [logline, setLogline] = useState('');
  const [sp, setSp] = useState<StructuredPrompt>(storage.loadDraft());
  const [choice, setChoice] = useState<ModelChoice>('seedance2');
  const [duration, setDuration] = useState<4 | 6>(4);
  const [ratio, setRatio] = useState<Ratio>('9:16');
  const [audio, setAudio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [usage, setUsage] = useState(storage.loadUsage());
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestStartedAt, setSuggestStartedAt] = useState<number | undefined>();
  const [logFilter, setLogFilter] = useState('');
  const [copiedAt, setCopiedAt] = useState<string | undefined>();

  useEffect(() => {
    setBp(localStorage.getItem(storage.keys.bp) || '');
    setOr(localStorage.getItem(storage.keys.or) || '');
    setHistory(storage.loadHistory());
    setLogs(storage.loadLogs());
  }, []);
  useEffect(() => {
    localStorage.setItem(storage.keys.draft, JSON.stringify(sp));
  }, [sp]);

  const addLog = (l: AppLog) =>
    setLogs(prev => {
      const n = [l, ...prev];
      storage.saveLogs(n);
      return n;
    });
  const updateRun = (id: string, patch: Partial<ActiveRun>) => setActiveRuns(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const saveKeys = () => {
    localStorage.setItem(storage.keys.bp, bp);
    localStorage.setItem(storage.keys.or, or);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(undefined), 2000);
  };
  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAt(key);
    setTimeout(() => setCopiedAt(undefined), 1500);
  };

  const suggest = async () => {
    setBusy(true);
    setSuggesting(true);
    setSuggestStartedAt(Date.now());
    const r = await fetch('/api/openrouter/suggest-prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: or, logline }) });
    const j = await r.json();
    if (!r.ok) {
      addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'failed', message: 'Suggest failed', errorDetails: j.error, rawJson: j });
      setSuggesting(false);
      setBusy(false);
      return;
    }
    setSp(j.structuredPrompt);
    addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'succeeded', message: 'Prompt Suggestion complete', rawJson: j });
    setSuggesting(false);
    setBusy(false);
  };

  const runOne = async (model: string) => {
    const runId = uid();
    const rec: GenerationRecord = { id: runId, timestamp: new Date().toISOString(), model, duration, ratio, generateAudio: audio, status: 'running', logline, structuredPrompt: sp };
    setHistory(v => [rec, ...v]);
    setActiveRuns(prev => [...prev, { id: runId, model, startedAt: Date.now(), phase: 'creating', pollCount: 0 }]);
    addLog({ id: uid(), timestamp: rec.timestamp, actionType: 'byteplus.create', status: 'running', message: 'Creating task', model, rawJson: { model } });
    const payload = { model, content: [{ type: 'text', text: toStructuredText(sp) }], generate_audio: audio, ratio, duration, watermark: false, resolution: '480p' };
    const cr = await fetch('/api/byteplus/create-task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: bp, payload }) });
    const cj = await cr.json();
    if (!cr.ok) {
      rec.status = 'failed';
      rec.error = cj.error;
      addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'byteplus.create', status: 'failed', message: 'Create task failed', model, errorDetails: cj.error, rawJson: cj });
      updateRun(runId, { phase: 'failed', error: cj.error || 'Create task failed' });
      finalize(rec);
      return;
    }
    if (!cj.id || typeof cj.id !== 'string') {
      rec.status = 'failed';
      rec.error = 'Create task succeeded but no task id returned';
      addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'byteplus.create', status: 'failed', message: 'Missing task id in response', model, rawJson: cj });
      updateRun(runId, { phase: 'failed', error: rec.error });
      finalize(rec);
      return;
    }
    rec.taskId = cj.id;
    addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'byteplus.create', status: 'queued', message: 'Task created', model, taskId: rec.taskId, rawJson: cj });
    updateRun(runId, { phase: 'queued', taskId: rec.taskId });
    const start = Date.now();
    let pollErrors = 0;
    let pollCount = 0;
    while (Date.now() - start < 600000) {
      await new Promise(r => setTimeout(r, 10000));
      const gr = await fetch('/api/byteplus/get-task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: bp, taskId: rec.taskId }) });
      const gj = await gr.json();
      if (!gr.ok) {
        pollErrors++;
        addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'byteplus.poll', status: 'error', message: `Poll request failed (${pollErrors}/3)`, model, taskId: rec.taskId, errorDetails: gj?.error, rawJson: gj });
        if (pollErrors >= 3) {
          rec.status = 'failed';
          rec.error = `Poll endpoint failed: ${gj?.error || 'unknown error'}`;
          updateRun(runId, { phase: 'failed', error: rec.error });
          finalize(rec);
          return;
        }
        continue;
      }
      pollErrors = 0;
      pollCount++;
      addLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'byteplus.poll', status: gj.status || 'unknown', message: 'Polling task', model, taskId: rec.taskId, rawJson: gj });
      updateRun(runId, { phase: 'polling', pollCount, lastPollStatus: gj.status || 'unknown' });
      if (gj.status === 'succeeded') {
        rec.status = 'succeeded';
        rec.videoUrl = gj.content?.video_url;
        rec.usageTotalTokens = gj.usage?.total_tokens ?? 0;
        rec.usageCompletionTokens = gj.usage?.completion_tokens ?? 0;
        rec.estimatedCostUsd = estimate(model, rec.usageTotalTokens ?? 0).usd;
        updateRun(runId, { phase: 'succeeded', videoUrl: rec.videoUrl });
        finalize(rec);
        return;
      }
      if (gj.status === 'failed' || gj.status === 'cancelled' || gj.status === 'expired') {
        rec.status = gj.status;
        rec.error = gj.error?.message || `Task ${gj.status}`;
        updateRun(runId, { phase: gj.status as RunPhase, error: rec.error });
        finalize(rec);
        return;
      }
    }
    rec.status = 'timeout';
    rec.error = 'Polling timed out';
    updateRun(runId, { phase: 'timeout', error: rec.error });
    finalize(rec);
  };

  const finalize = (rec: GenerationRecord) => {
    setHistory(prev => {
      const n = [rec, ...prev.filter(h => h.id !== rec.id)];
      storage.saveHistory(n);
      return n;
    });
    setUsage(prev => {
      const u = {
        ...prev,
        totalVideos: prev.totalVideos + 1,
        successVideos: prev.successVideos + (rec.status === 'succeeded' ? 1 : 0),
        failedVideos: prev.failedVideos + (rec.status === 'succeeded' ? 0 : 1),
        totalTokens: prev.totalTokens + (rec.usageTotalTokens ?? 0),
        totalCompletionTokens: prev.totalCompletionTokens + (rec.usageCompletionTokens ?? 0),
        resourceTokensConsumed: prev.resourceTokensConsumed + (rec.usageTotalTokens ?? 0),
        usdUsed: prev.usdUsed + (rec.estimatedCostUsd ?? 0),
      };
      storage.saveUsage(u);
      return u;
    });
  };

  const generate = async () => {
    setBusy(true);
    setActiveRuns([]);
    if (choice === 'both') {
      await runOne('dreamina-seedance-2-0-260128');
      await runOne('dreamina-seedance-2-0-fast-260128');
    } else {
      await runOne(mapModel(choice));
    }
    setBusy(false);
  };

  const m = useMemo(() => metrics(usage.resourceTokensConsumed, usage.successVideos), [usage]);
  const filteredLogs = useMemo(() => {
    if (!logFilter) return logs;
    const q = logFilter.toLowerCase();
    return logs.filter(l => (l.actionType + ' ' + l.status + ' ' + l.message + ' ' + (l.model || '')).toLowerCase().includes(q));
  }, [logs, logFilter]);

  return (
    <main className="app-shell">
      <Sidebar open={open} setOpen={setOpen} screen={screen} setScreen={setScreen} />
      <header className="topbar">
        <HamburgerButton onClick={() => setOpen(true)} />
        <h1 className="text-base font-semibold tracking-tight">{SCREEN_TITLE[screen]}</h1>
      </header>
      <div className="container-narrow pt-3">
        {screen === 'settings' && (
          <section className="card space-y-4">
            <div>
              <div className="section-title">API keys</div>
              <div className="section-sub">Stored locally in your browser. Never sent anywhere except the relevant API.</div>
            </div>
            <div className="field">
              <label className="label">BytePlus API key</label>
              <div className="flex gap-2">
                <input className="input font-mono" type={showBp ? 'text' : 'password'} placeholder="bp_…" value={bp} onChange={e => setBp(e.target.value)} />
                <button className="btn-secondary shrink-0" onClick={() => setShowBp(v => !v)}>{showBp ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div className="field">
              <label className="label">OpenRouter API key</label>
              <div className="flex gap-2">
                <input className="input font-mono" type={showOr ? 'text' : 'password'} placeholder="sk-or-…" value={or} onChange={e => setOr(e.target.value)} />
                <button className="btn-secondary shrink-0" onClick={() => setShowOr(v => !v)}>{showOr ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={saveKeys}>Save keys</button>
              {savedAt && <span className="text-xs text-emerald-300">Saved</span>}
            </div>
          </section>
        )}

        {screen === 'generate' && (
          <>
            <section className="card space-y-3">
              <div>
                <div className="section-title">Logline</div>
                <div className="section-sub">A one-line idea. The prompt suggester expands it into the seven fields below.</div>
              </div>
              <textarea className="input min-h-20" placeholder="e.g. A cyclist races a thunderstorm down a coastal road at dusk." value={logline} onChange={e => setLogline(e.target.value)} />
              <button className="btn-primary w-full" disabled={!or || busy || !logline} onClick={suggest}>{suggesting ? 'Suggesting…' : 'Suggest structured prompt'}</button>
            </section>

            <section className="card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="section-title">Structured prompt</div>
                  <div className="section-sub">Edit any field before generating.</div>
                </div>
              </div>
              {(Object.keys(SP_LABEL) as (keyof StructuredPrompt)[]).map(k => (
                <div key={k} className="field">
                  <label className="label">{SP_LABEL[k]}</label>
                  <input className="input" value={sp[k]} onChange={e => setSp({ ...sp, [k]: e.target.value })} placeholder={`Describe ${SP_LABEL[k].toLowerCase()}`} />
                </div>
              ))}
              <div className="flex gap-2 flex-wrap">
                <button className="btn-secondary" onClick={() => copy('sp', toStructuredText(sp))}>{copiedAt === 'sp' ? 'Copied' : 'Copy structured text'}</button>
                <button className="btn-secondary" onClick={() => copy('json', JSON.stringify({ model: mapModel(choice === 'both' ? 'seedance2' : choice), content: [{ type: 'text', text: toStructuredText(sp) }], generate_audio: audio, ratio, duration, watermark: false, resolution: '480p' }, null, 2))}>{copiedAt === 'json' ? 'Copied' : 'Copy BytePlus payload JSON'}</button>
              </div>
            </section>

            <section className="card space-y-3">
              <div className="section-title">Settings</div>
              <div className="field">
                <label className="label">Model</label>
                <select className="input" value={choice} onChange={e => setChoice(e.target.value as ModelChoice)}>
                  <option value="seedance2">Seedance 2.0</option>
                  <option value="seedance2fast">Seedance 2.0 fast</option>
                  <option value="both">Both (runs sequentially)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="field">
                  <label className="label">Duration</label>
                  <select className="input" value={duration} onChange={e => setDuration(Number(e.target.value) as 4 | 6)}>
                    <option value={4}>4 seconds</option>
                    <option value={6}>6 seconds</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Aspect ratio</label>
                  <select className="input" value={ratio} onChange={e => setRatio(e.target.value as Ratio)}>
                    <option>9:16</option>
                    <option>16:9</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={audio} onChange={e => setAudio(e.target.checked)} />
                Generate audio
              </label>
              <div className="text-xs text-muted">Resolution fixed at 480p (PoC).</div>
              <button className="btn-primary w-full" disabled={!bp || !or || busy} onClick={generate}>{busy ? 'Generating…' : 'Generate'}</button>
            </section>

            <GenerationStatus runs={activeRuns} suggesting={suggesting} suggestStartedAt={suggestStartedAt} />
          </>
        )}

        {screen === 'history' && (
          <section className="space-y-2">
            {history.length === 0 && <div className="card text-sm text-muted">No generations yet.</div>}
            {history.map(h => (
              <article key={h.id} className="card-tight space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={statusPillClass(h.status)}>{h.status}</span>
                  <span className="text-xs text-muted">{shortModelLabel(h.model)}</span>
                  <span className="text-xs text-muted ml-auto">{timeAgo(h.timestamp)}</span>
                </div>
                <div className="text-sm break-words">{h.logline || <span className="text-muted italic">No logline</span>}</div>
                {h.videoUrl && <video className="w-full rounded-lg" controls src={h.videoUrl} />}
                <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                  {typeof h.usageTotalTokens === 'number' && <span>{fmtNum(h.usageTotalTokens)} tokens</span>}
                  {typeof h.estimatedCostUsd === 'number' && <span>${h.estimatedCostUsd.toFixed(4)}</span>}
                  {h.videoUrl && (<a className="text-accent hover:text-accent-hover ml-auto" href={h.videoUrl} target="_blank" rel="noreferrer">Open video</a>)}
                </div>
                {h.error && <div className="text-xs text-rose-300 break-words">{h.error}</div>}
              </article>
            ))}
          </section>
        )}

        {screen === 'usage' && (
          <>
            <section className="grid grid-cols-2 gap-2">
              <Stat label="Total" value={fmtNum(usage.totalVideos)} hint="videos" />
              <Stat label="Succeeded" value={fmtNum(usage.successVideos)} tone="green" />
              <Stat label="Failed" value={fmtNum(usage.failedVideos)} tone="red" />
              <Stat label="USD used" value={`$${usage.usdUsed.toFixed(4)}`} />
            </section>
            <section className="card space-y-3">
              <div className="section-title">Resource pack</div>
              <ProgressBar consumed={usage.resourceTokensConsumed} total={7_000_000} />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <KV k="Consumed" v={`${fmtNum(usage.resourceTokensConsumed)} tk`} />
                <KV k="Remaining" v={`${fmtNum(m.remainingTokens)} tk`} />
                <KV k="USD remaining" v={`$${m.remainingUsd.toFixed(4)}`} />
                <KV k="Approx videos left" v={m.approxVideos ?? '—'} />
              </div>
            </section>
            <section className="card space-y-2 text-xs">
              <div className="section-title">Tokens</div>
              <KV k="Total billed tokens" v={fmtNum(usage.totalTokens)} />
              <KV k="Total completion tokens" v={fmtNum(usage.totalCompletionTokens)} />
            </section>
          </>
        )}

        {screen === 'logs' && (
          <>
            <input className="input" placeholder="Filter by type, status, model…" value={logFilter} onChange={e => setLogFilter(e.target.value)} />
            <section className="space-y-2">
              {filteredLogs.length === 0 && <div className="card text-sm text-muted">No logs match.</div>}
              {filteredLogs.map(l => (
                <details key={l.id} className="card-tight text-sm">
                  <summary className="cursor-pointer list-none flex items-center gap-2 flex-wrap">
                    <span className={l.status === 'succeeded' || l.status === 'queued' ? 'pill-green' : l.status === 'failed' || l.status === 'error' ? 'pill-red' : l.status === 'running' ? 'pill-amber' : 'pill-muted'}>{l.status}</span>
                    <span className="text-xs text-muted">{l.actionType}</span>
                    <span className="ml-auto text-xs text-muted">{dt(l.timestamp)}</span>
                    <span className="basis-full text-xs">{l.message}{l.errorDetails ? ` — ${l.errorDetails}` : ''}</span>
                  </summary>
                  <pre className="text-xs overflow-auto mt-2 p-2 rounded bg-bg/60 border border-border">{JSON.stringify(l.rawJson, null, 2)}</pre>
                </details>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'green' | 'red' }) {
  const toneClass = tone === 'green' ? 'text-emerald-300' : tone === 'red' ? 'text-rose-300' : 'text-white';
  return (
    <div className="card-tight">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function ProgressBar({ consumed, total }: { consumed: number; total: number }) {
  const pct = Math.min(100, Math.max(0, (consumed / total) * 100));
  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-bg overflow-hidden border border-border">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted">{pct.toFixed(2)}% used</div>
    </div>
  );
}
