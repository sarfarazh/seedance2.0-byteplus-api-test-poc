'use client';
import { useState, useEffect } from 'react';
import { AppLog } from '@/types/app';
import { uid } from '@/lib/utils';

interface Props {
  orApiKey: string;
  clientId: string;
  onLog: (log: AppLog) => void;
}

const DRAFT_KEY = 'story_draft';

function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(DRAFT_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

export default function StoryScreen({ orApiKey, clientId, onLog }: Props) {
  const [logline, setLogline] = useState('');
  const [beatSheet, setBeatSheet] = useState('');
  const [treatment, setTreatment] = useState('');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState<'beat-sheet' | 'treatment' | 'script' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = loadDraft();
    if (d) {
      if (d.logline) setLogline(d.logline);
      if (d.beatSheet) setBeatSheet(d.beatSheet);
      if (d.treatment) setTreatment(d.treatment);
      if (d.script) setScript(d.script);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ logline, beatSheet, treatment, script }));
  }, [logline, beatSheet, treatment, script]);

  const makeBody = (extra: Record<string, string>) => {
    const body: Record<string, string> = { ...extra };
    if (clientId) body.clientId = clientId;
    if (orApiKey) body.clientApiKey = orApiKey;
    return body;
  };

  const generateBeatSheet = async () => {
    if (!logline.trim() || generating) return;
    setGenerating('beat-sheet');
    setError(null);
    const startedAt = Date.now();
    try {
      const r = await fetch('/api/openrouter/beat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody({ logline })),
      });
      const j = await r.json();
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (!r.ok) {
        const msg = j.error || 'Beat sheet generation failed';
        setError(msg);
        onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'error', message: `Beat sheet failed: ${msg}`, rawJson: j });
      } else {
        setBeatSheet(j.beatSheet ?? '');
        onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'succeeded', message: `Beat sheet generated in ${elapsed}s`, rawJson: j });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
      onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'error', message: `Beat sheet failed: ${msg}` });
    } finally {
      setGenerating(null);
    }
  };

  const generateTreatment = async () => {
    if (!beatSheet.trim() || generating) return;
    setGenerating('treatment');
    setError(null);
    const startedAt = Date.now();
    try {
      const r = await fetch('/api/openrouter/treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody({ logline, beatSheet })),
      });
      const j = await r.json();
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (!r.ok) {
        const msg = j.error || 'Treatment generation failed';
        setError(msg);
        onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'error', message: `Treatment failed: ${msg}`, rawJson: j });
      } else {
        setTreatment(j.treatment ?? '');
        onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'succeeded', message: `Treatment generated in ${elapsed}s`, rawJson: j });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
      onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'error', message: `Treatment failed: ${msg}` });
    } finally {
      setGenerating(null);
    }
  };

  const generateScript = async () => {
    if (!treatment.trim() || generating) return;
    setGenerating('script');
    setError(null);
    const startedAt = Date.now();
    try {
      const r = await fetch('/api/openrouter/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody({ logline, beatSheet, treatment })),
      });
      const j = await r.json();
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (!r.ok) {
        const msg = j.error || 'Script generation failed';
        setError(msg);
        onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'error', message: `Script failed: ${msg}`, rawJson: j });
      } else {
        setScript(j.script ?? '');
        onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'succeeded', message: `Script generated in ${elapsed}s`, rawJson: j });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
      onLog({ id: uid(), timestamp: new Date().toISOString(), actionType: 'openrouter', status: 'error', message: `Script failed: ${msg}` });
    } finally {
      setGenerating(null);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearAll = () => {
    setLogline('');
    setBeatSheet('');
    setTreatment('');
    setScript('');
    setError(null);
  };

  const locked = generating !== null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="card border-rose-500/40 bg-rose-500/5 text-xs text-rose-300 break-words">{error}</div>
      )}

      {/* Step 1 — Logline */}
      <section className="card space-y-3">
        <div>
          <div className="section-title">1 — Logline</div>
          <div className="section-sub">One sentence that captures the story. Everything below builds from this.</div>
        </div>
        <textarea
          className="input min-h-20"
          placeholder="e.g. A disgraced detective on her last case discovers the killer is her estranged daughter."
          value={logline}
          onChange={e => setLogline(e.target.value)}
          disabled={locked}
        />
        <button
          className="btn-primary w-full"
          disabled={locked || !logline.trim()}
          onClick={generateBeatSheet}
        >
          {generating === 'beat-sheet' ? <><Spinner /> Generating beat sheet…</> : 'Generate Beat Sheet'}
        </button>
      </section>

      {/* Step 2 — Beat Sheet */}
      <section className={`card space-y-3 transition-opacity ${!logline.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
        <div>
          <div className="section-title">2 — Beat Sheet</div>
          <div className="section-sub">Save the Cat 15-beat structure. Edit freely before proceeding.</div>
        </div>
        <textarea
          className="input min-h-64"
          placeholder="Beat sheet will appear here after generation. You can also write or paste one directly."
          value={beatSheet}
          onChange={e => setBeatSheet(e.target.value)}
          disabled={locked}
        />
        <button
          className="btn-primary w-full"
          disabled={locked || !beatSheet.trim()}
          onClick={generateTreatment}
        >
          {generating === 'treatment' ? <><Spinner /> Generating treatment…</> : 'Generate Treatment'}
        </button>
      </section>

      {/* Step 3 — Treatment */}
      <section className={`card space-y-3 transition-opacity ${!beatSheet.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
        <div>
          <div className="section-title">3 — Treatment</div>
          <div className="section-sub">Cinematic prose narrative. Edit before generating the script.</div>
        </div>
        <textarea
          className="input min-h-48"
          placeholder="Treatment will appear here after generation. You can also write or paste one directly."
          value={treatment}
          onChange={e => setTreatment(e.target.value)}
          disabled={locked}
        />
        <button
          className="btn-primary w-full"
          disabled={locked || !treatment.trim()}
          onClick={generateScript}
        >
          {generating === 'script' ? <><Spinner /> Generating script…</> : 'Generate Script'}
        </button>
      </section>

      {/* Step 4 — Script */}
      <section className={`card space-y-3 transition-opacity ${!treatment.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="section-title">4 — Script</div>
            <div className="section-sub">Screenplay format. Edit, copy, or use as reference.</div>
          </div>
          {script && (
            <button className="btn-secondary shrink-0 text-xs" onClick={copyScript}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        <textarea
          className="input min-h-64 font-mono text-xs leading-relaxed"
          placeholder="Script will appear here after generation."
          value={script}
          onChange={e => setScript(e.target.value)}
          disabled={locked}
        />
      </section>

      {/* Clear */}
      {(logline || beatSheet || treatment || script) && (
        <button className="btn-ghost w-full text-xs" onClick={clearAll} disabled={locked}>
          Clear all
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
