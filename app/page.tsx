'use client';
import { useEffect, useMemo, useState } from 'react';
import Sidebar, { HamburgerButton, SCREEN_TITLE } from '@/components/sidebar';
import GenerationStatus, { ActiveRun, RunPhase } from '@/components/generate/generation-status';
import { AppLog, GenerationRecord, GenerationStatus as GenStatus, ModelChoice, Ratio, Screen, StructuredPrompt } from '@/types/app';
import { OpenRouterKeyInfo } from '@/types/openrouter';
import { storage } from '@/lib/storage';
import { estimate, metrics } from '@/lib/pricing';
import { estimateGenerationCost } from '@/lib/estimate-cost';
import { toStructuredText } from '@/lib/prompt';
import { dt, uid } from '@/lib/utils';

const BYTEPLUS_BILLING_URL = 'https://console.byteplus.com/finance';
const OPENROUTER_KEYS_URL = 'https://openrouter.ai/keys';

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
const timeOnly = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};
const logPillClass = (s: string) => {
  if (s === 'succeeded' || s === 'queued') return 'pill-green';
  if (s === 'failed' || s === 'error') return 'pill-red';
  if (s === 'running' || s === 'polling') return 'pill-amber';
  return 'pill-muted';
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>('generate');
  const [open, setOpen] = useState(false);
  const [bp, setBp] = useState('');
  const [or, setOr] = useState('');
  const [bpDraft, setBpDraft] = useState('');
  const [orDraft, setOrDraft] = useState('');
  const [bpEditing, setBpEditing] = useState(false);
  const [orEditing, setOrEditing] = useState(false);
  const [showBp, setShowBp] = useState(false);
  const [showOr, setShowOr] = useState(false);
  const [bpSavedAt, setBpSavedAt] = useState<number | undefined>();
  const [orSavedAt, setOrSavedAt] = useState<number | undefined>();
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
  const [orInfo, setOrInfo] = useState<OpenRouterKeyInfo['data'] | undefined>();
  const [orInfoErr, setOrInfoErr] = useState<string | undefined>();
  const [orInfoLoading, setOrInfoLoading] = useState(false);
  const [orInfoFetchedAt, setOrInfoFetchedAt] = useState<number | undefined>();

  useEffect(() => {
    const savedBp = localStorage.getItem(storage.keys.bp) || '';
    const savedOr = localStorage.getItem(storage.keys.or) || '';
    setBp(savedBp);
    setOr(savedOr);
    setBpEditing(!savedBp);
    setOrEditing(!savedOr);
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
  const editBp = () => {
    setBpDraft(bp);
    setBpEditing(true);
    setShowBp(false);
  };
  const editOr = () => {
    setOrDraft(or);
    setOrEditing(true);
    setShowOr(false);
  };
  const saveBp = () => {
    const v = bpDraft.trim();
    setBp(v);
    localStorage.setItem(storage.keys.bp, v);
    setBpEditing(!v);
    setShowBp(false);
    setBpSavedAt(Date.now());
    setTimeout(() => setBpSavedAt(undefined), 2000);
  };
  const saveOr = () => {
    const v = orDraft.trim();
    setOr(v);
    localStorage.setItem(storage.keys.or, v);
    setOrEditing(!v);
    setShowOr(false);
    setOrSavedAt(Date.now());
    setTimeout(() => setOrSavedAt(undefined), 2000);
  };
  const cancelBp = () => {
    setBpDraft('');
    setBpEditing(!bp);
    setShowBp(false);
  };
  const cancelOr = () => {
    setOrDraft('');
    setOrEditing(!or);
    setShowOr(false);
  };
  const clearBp = () => {
    setBp('');
    setBpDraft('');
    localStorage.removeItem(storage.keys.bp);
    setBpEditing(true);
    setShowBp(false);
  };
  const clearOr = () => {
    setOr('');
    setOrDraft('');
    localStorage.removeItem(storage.keys.or);
    setOrEditing(true);
    setShowOr(false);
  };
  const maskKey = (k: string) => {
    if (k.length <= 8) return '•'.repeat(Math.max(4, k.length));
    return `${k.slice(0, 4)}${'•'.repeat(Math.min(12, k.length - 8))}${k.slice(-4)}`;
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

  const fetchOrInfo = async () => {
    if (!or) {
      setOrInfo(undefined);
      setOrInfoErr('Add an OpenRouter key in Settings to see balance.');
      return;
    }
    setOrInfoLoading(true);
    setOrInfoErr(undefined);
    try {
      const r = await fetch('/api/openrouter/key-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: or }) });
      const j = await r.json();
      if (!r.ok) {
        setOrInfoErr(j?.error || `Request failed (${r.status})`);
        setOrInfo(undefined);
      } else {
        setOrInfo(j.data);
        setOrInfoFetchedAt(Date.now());
      }
    } catch (e) {
      setOrInfoErr(e instanceof Error ? e.message : 'Network error');
      setOrInfo(undefined);
    } finally {
      setOrInfoLoading(false);
    }
  };

  useEffect(() => {
    if (screen === 'usage' && or && !orInfoLoading && (!orInfoFetchedAt || Date.now() - orInfoFetchedAt > 60000)) {
      fetchOrInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, or]);

  const m = useMemo(() => metrics(usage.resourceTokensConsumed, usage.successVideos), [usage]);

  const costEstimate = useMemo(() => {
    const models = choice === 'both' ? ['dreamina-seedance-2-0-260128', 'dreamina-seedance-2-0-fast-260128'] : [mapModel(choice)];
    const parts = models.map(mm => ({ model: mm, est: estimateGenerationCost(mm, duration, history) }));
    const usdLow = parts.reduce((s, p) => s + p.est.usdLow, 0);
    const usdHigh = parts.reduce((s, p) => s + p.est.usdHigh, 0);
    const tokensLow = parts.reduce((s, p) => s + p.est.tokensLow, 0);
    const tokensHigh = parts.reduce((s, p) => s + p.est.tokensHigh, 0);
    const fromHistory = parts.every(p => p.est.source === 'history');
    const totalSamples = parts.reduce((s, p) => s + p.est.sampleCount, 0);
    return { usdLow, usdHigh, tokensLow, tokensHigh, fromHistory, totalSamples, parts };
  }, [choice, duration, history]);
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
        <h1 className="heading-lg">{SCREEN_TITLE[screen]}</h1>
      </header>
      <div className="container-narrow pt-3">
        {screen === 'settings' && (
          <>
            <section className="card space-y-2">
              <div className="section-title">API keys</div>
              <div className="section-sub">Stored only in your browser&apos;s localStorage. Sent only to the relevant API (BytePlus or OpenRouter) when you call it.</div>
            </section>

            <KeyCard
              title="BytePlus API key"
              instructions={<>Used to call Seedance 2.0 via BytePlus ModelArk. Create a key in the <a className="link" href="https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey" target="_blank" rel="noreferrer">BytePlus ModelArk console</a> (ap-southeast-1 region) and paste it below.</>}
              placeholder="paste BytePlus API key"
              saved={bp}
              editing={bpEditing}
              draft={bpDraft}
              setDraft={setBpDraft}
              show={showBp}
              toggleShow={() => setShowBp(v => !v)}
              onEdit={editBp}
              onSave={saveBp}
              onCancel={cancelBp}
              onClear={clearBp}
              savedAt={bpSavedAt}
              masked={maskKey(bp)}
            />

            <KeyCard
              title="OpenRouter API key"
              instructions={<>Used for prompt suggestion via Claude on OpenRouter. Create a key at the <a className="link" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">OpenRouter keys page</a> and paste it below.</>}
              placeholder="paste OpenRouter API key"
              saved={or}
              editing={orEditing}
              draft={orDraft}
              setDraft={setOrDraft}
              show={showOr}
              toggleShow={() => setShowOr(v => !v)}
              onEdit={editOr}
              onSave={saveOr}
              onCancel={cancelOr}
              onClear={clearOr}
              savedAt={orSavedAt}
              masked={maskKey(or)}
            />
          </>
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
              <div className="card-tight !p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">Estimated cost</span>
                  <span className="text-sm font-semibold">
                    {costEstimate.usdLow === costEstimate.usdHigh
                      ? `~$${costEstimate.usdLow.toFixed(4)}`
                      : `~$${costEstimate.usdLow.toFixed(4)} – $${costEstimate.usdHigh.toFixed(4)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {costEstimate.fromHistory
                      ? `Based on ${costEstimate.totalSamples} past video${costEstimate.totalSamples === 1 ? '' : 's'}`
                      : 'Pixel-formula estimate (no history yet)'}
                  </span>
                  <span>
                    {costEstimate.tokensLow === costEstimate.tokensHigh
                      ? `${fmtNum(costEstimate.tokensLow)} tk`
                      : `${fmtNum(costEstimate.tokensLow)}–${fmtNum(costEstimate.tokensHigh)} tk`}
                  </span>
                </div>
              </div>
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
                  {h.videoUrl && (<a className="link ml-auto" href={h.videoUrl} target="_blank" rel="noreferrer">Open video</a>)}
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
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="section-title">BytePlus resource pack</div>
                  <div className="section-sub">Local estimate from token usage returned by each generation. For the authoritative balance, check the BytePlus console.</div>
                </div>
                <a className="btn-secondary shrink-0 text-xs" href={BYTEPLUS_BILLING_URL} target="_blank" rel="noreferrer">Open ↗</a>
              </div>
              <ProgressBar consumed={usage.resourceTokensConsumed} total={7_000_000} />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <KV k="Consumed" v={`${fmtNum(usage.resourceTokensConsumed)} tk`} />
                <KV k="Remaining" v={`${fmtNum(m.remainingTokens)} tk`} />
                <KV k="USD remaining" v={`$${m.remainingUsd.toFixed(4)}`} />
                <KV k="Approx videos left" v={m.approxVideos ?? '—'} />
              </div>
            </section>

            <section className="card space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="section-title">OpenRouter</div>
                    {orInfo && (orInfo.is_free_tier ? <span className="pill-muted">Free tier</span> : <span className="pill-green">Paid</span>)}
                  </div>
                  <div className="section-sub">Live balance from <code className="font-mono">/api/v1/key</code>.{orInfoFetchedAt && ` Last fetched ${timeAgo(new Date(orInfoFetchedAt).toISOString())}.`}</div>
                </div>
                <button className="btn-secondary shrink-0 text-xs" onClick={fetchOrInfo} disabled={orInfoLoading}>{orInfoLoading ? '…' : 'Refresh'}</button>
                <a className="btn-secondary shrink-0 text-xs" href={OPENROUTER_KEYS_URL} target="_blank" rel="noreferrer">Open ↗</a>
              </div>
              {orInfoErr && <div className="text-xs text-rose-300 break-words">{orInfoErr}</div>}
              {orInfo && (
                <>
                  {orInfo.limit !== null && orInfo.limit_remaining !== null ? (
                    <>
                      <ProgressBar consumed={orInfo.limit - orInfo.limit_remaining} total={orInfo.limit} />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <KV k="Remaining" v={`$${orInfo.limit_remaining.toFixed(4)}`} />
                        <KV k="Limit" v={`$${orInfo.limit.toFixed(4)}`} />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted">No credit limit set on this key (pay-as-you-go or BYOK).</div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <KV k="Today" v={`$${orInfo.usage_daily.toFixed(4)}`} />
                    <KV k="This week" v={`$${orInfo.usage_weekly.toFixed(4)}`} />
                    <KV k="This month" v={`$${orInfo.usage_monthly.toFixed(4)}`} />
                    <KV k="All time" v={`$${orInfo.usage.toFixed(4)}`} />
                  </div>
                </>
              )}
              {!orInfo && !orInfoErr && !orInfoLoading && <div className="text-xs text-muted">Click Refresh to load.</div>}
            </section>

            <section className="card space-y-2 text-xs">
              <div className="section-title">Local tokens</div>
              <KV k="Total billed tokens (BytePlus)" v={fmtNum(usage.totalTokens)} />
              <KV k="Total completion tokens" v={fmtNum(usage.totalCompletionTokens)} />
            </section>
          </>
        )}

        {screen === 'logs' && (
          <>
            <input className="input" placeholder="Filter by type, status, model…" value={logFilter} onChange={e => setLogFilter(e.target.value)} />
            {filteredLogs.length === 0 ? (
              <div className="card text-sm text-muted">No logs match.</div>
            ) : (
              <section className="card !p-0 overflow-hidden">
                {filteredLogs.map((l, i) => (
                  <details key={l.id} className={`group ${i > 0 ? 'border-t border-border' : ''}`}>
                    <summary className="cursor-pointer list-none flex items-center gap-2 px-3 py-2 hover:bg-surface-2 transition-colors">
                      <span className={logPillClass(l.status)}>{l.status}</span>
                      <span className="text-xs text-muted shrink-0 hidden sm:inline">{l.actionType}</span>
                      <span className="text-xs truncate min-w-0 flex-1">
                        <span className="text-muted sm:hidden">{l.actionType}: </span>
                        {l.message}{l.errorDetails ? ` · ${l.errorDetails}` : ''}
                      </span>
                      <span className="text-[11px] text-muted shrink-0 tabular">{timeOnly(l.timestamp)}</span>
                      <svg className="w-3 h-3 text-muted shrink-0 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </summary>
                    <div className="border-t border-border px-3 py-2 bg-surface-2/40 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-muted flex-wrap">
                        <span>{dt(l.timestamp)}</span>
                        {l.model && <span>· {shortModelLabel(l.model)}</span>}
                        {l.taskId && <span>· task <span className="font-mono">{l.taskId.slice(0, 8)}…</span></span>}
                      </div>
                      {l.errorDetails && <div className="text-xs text-rose-300 break-words">{l.errorDetails}</div>}
                      <pre className="text-[11px] overflow-auto p-2 rounded bg-bg border border-border max-h-72">{JSON.stringify(l.rawJson, null, 2)}</pre>
                    </div>
                  </details>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function KeyCard({
  title,
  instructions,
  placeholder,
  saved,
  editing,
  draft,
  setDraft,
  show,
  toggleShow,
  onEdit,
  onSave,
  onCancel,
  onClear,
  savedAt,
  masked,
}: {
  title: string;
  instructions: React.ReactNode;
  placeholder: string;
  saved: string;
  editing: boolean;
  draft: string;
  setDraft: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onClear: () => void;
  savedAt?: number;
  masked: string;
}) {
  return (
    <section className="card space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="section-title">{title}</div>
          <div className="section-sub mt-1">{instructions}</div>
        </div>
        {saved && !editing && <span className="pill-green shrink-0">Saved</span>}
        {!saved && !editing && <span className="pill-muted shrink-0">Not set</span>}
        {!saved && editing && <span className="pill-amber shrink-0">Required</span>}
      </div>

      {!editing && saved && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="flex-1 input font-mono text-muted select-all">{masked}</code>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={onEdit}>Edit</button>
            <button className="btn-secondary flex-1 text-rose-300 hover:text-rose-200" onClick={onClear}>Clear</button>
          </div>
          {savedAt && <div className="text-xs text-emerald-300">Saved</div>}
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="input font-mono"
              type={show ? 'text' : 'password'}
              placeholder={placeholder}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn-secondary shrink-0" onClick={toggleShow}>{show ? 'Hide' : 'Show'}</button>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={!draft.trim()} onClick={onSave}>Save</button>
            {saved && <button className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'green' | 'red' }) {
  const toneClass = tone === 'green' ? 'text-emerald-300' : tone === 'red' ? 'text-rose-300' : 'text-white';
  return (
    <div className="card-tight">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-xl font-semibold mt-1 tabular ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className="font-medium tabular">{v}</span>
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
