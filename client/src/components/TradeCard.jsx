import { useState, useEffect } from 'react';
import { uploadChartSnapshot } from '../api/uploadSnapshot';

const DIRECTIONS = ['LONG', 'SHORT'];
const PLAN_OPTIONS = ['YES', 'NO', 'NA'];

export default function TradeCard({ trade, index, onChange, onRemove, setupOptions = [], accountId }) {
  const set = (field) => (e) => onChange(index, { ...trade, [field]: e.target.value });
  const setEmotion = (field) => (e) => onChange(index, { ...trade, emotion: { ...trade.emotion, [field]: e.target.value } });
  // Clearing whatTriggeredIt on "No" matters, not just cosmetic — without
  // it, switching your answer from Yes to No would leave a stale trigger
  // reason saved against a trade now marked as having no urge at all.
  const setUrgeToBreakRules = (value) =>
    onChange(index, { ...trade, emotion: { ...trade.emotion, urgeToBreakRules: value, whatTriggeredIt: value ? trade.emotion?.whatTriggeredIt : '' } });

  const [showCustomMethod, setShowCustomMethod] = useState(isCustomMethod(trade.method, setupOptions));
  const [uploadingSnapshot, setUploadingSnapshot] = useState(false);
  const [showEmotion, setShowEmotion] = useState(hasEmotionContent(trade.emotion));

  // Trade data often arrives *after* mount (loaded async once the saved log
  // fetches), so the initial useState above — evaluated once, at mount —
  // can miss it. This re-checks whenever the method or the options list
  // actually changes, and only ever turns custom mode ON here; the manual
  // "back to list" button is what turns it off, as a deliberate user action.
  useEffect(() => {
    if (isCustomMethod(trade.method, setupOptions)) setShowCustomMethod(true);
  }, [trade.method, setupOptions]);

  async function handleSnapshotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSnapshot(true);
    try {
      const url = await uploadChartSnapshot(accountId, file);
      onChange(index, { ...trade, chartSnapshotUrl: url });
    } catch {
      alert('Upload failed — try a smaller image or check your connection.');
    } finally {
      setUploadingSnapshot(false);
    }
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wide text-amber">TRADE {index + 1}</h3>
        <button type="button" onClick={() => onRemove(index)} className="text-xs font-mono text-gray-500 hover:text-red transition-colors">
          remove
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <Field label="Time (IST)">
          <input type="time" value={trade.time || ''} onChange={set('time')} className="input" />
        </Field>
        <Field label="Direction">
          <select value={trade.direction || 'LONG'} onChange={set('direction')} className="input">
            {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Entry">
          <input type="number" step="0.00001" value={trade.entry ?? ''} onChange={set('entry')} className="input" placeholder="—" />
        </Field>
        <Field label="Stop Loss">
          <input type="number" step="0.00001" value={trade.stopLoss ?? ''} onChange={set('stopLoss')} className="input" placeholder="—" />
        </Field>
        <Field label="Take Profit">
          <input type="number" step="0.00001" value={trade.takeProfit ?? ''} onChange={set('takeProfit')} className="input" placeholder="—" />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
        <Field label="Lot Size">
          <input type="number" step="0.01" value={trade.lotSize ?? ''} onChange={set('lotSize')} className="input" placeholder="—" />
        </Field>
        <Field label="R:R">
          <input value={trade.riskReward || ''} onChange={set('riskReward')} className="input" placeholder="e.g. 1:2" />
        </Field>
        <Field label="Method">
          <MethodPicker
            method={trade.method}
            setupOptions={setupOptions}
            showCustom={showCustomMethod}
            onSelect={(value) => onChange(index, { ...trade, method: value })}
            onEnterCustom={() => { setShowCustomMethod(true); onChange(index, { ...trade, method: '' }); }}
            onBackToList={() => setShowCustomMethod(false)}
          />
        </Field>
        <Field label="COT Signal">
          <input value={trade.cotSignal || ''} onChange={set('cotSignal')} className="input" placeholder="Bull / Bear" />
        </Field>
        <Field label="Result (R)">
          <input type="number" step="0.1" value={trade.resultR ?? ''} onChange={set('resultR')} className="input" placeholder="—" />
        </Field>
        <Field label="Outcome">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onChange(index, { ...trade, outcome: 'SL' })}
              className={`flex-1 py-2 rounded-md text-xs font-mono border ${trade.outcome === 'SL' ? 'bg-red/20 border-red text-red font-semibold' : 'border-border text-gray-500'}`}
            >
              SL
            </button>
            <button
              type="button"
              onClick={() => onChange(index, { ...trade, outcome: 'TP' })}
              className={`flex-1 py-2 rounded-md text-xs font-mono border ${trade.outcome === 'TP' ? 'bg-green/20 border-green text-green font-semibold' : 'border-border text-gray-500'}`}
            >
              TP
            </button>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <Field label="P/L (₹/$)">
          <input type="number" step="0.01" value={trade.pnl ?? ''} onChange={set('pnl')} className="input" placeholder="—" />
        </Field>
        <Field label="Setup / Liquidity Sweep Description">
          <textarea value={trade.setupDescription || ''} onChange={set('setupDescription')} className="input h-16 resize-none" placeholder="Describe the setup..." />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start mb-3">
        <Field label="DOM Confirmation? (bid/ask imbalance, spoofing check)">
          <textarea value={trade.domConfirmation || ''} onChange={set('domConfirmation')} className="input h-16 resize-none" placeholder="DOM observations..." />
        </Field>
        <Field label="Followed Plan Exactly?">
          <div className="flex gap-2">
            {PLAN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(index, { ...trade, followedPlan: opt })}
                className={`px-3 py-2 rounded-md text-xs font-mono border transition-colors ${
                  trade.followedPlan === opt ? 'bg-amber text-[#1A1305] border-amber font-semibold' : 'border-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mb-1">
        <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Chart Snapshot</span>
        {trade.chartSnapshotUrl && (
          <img src={trade.chartSnapshotUrl} alt="Trade chart snapshot" className="rounded-md border border-border mb-2 max-h-48" />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleSnapshotUpload}
          disabled={uploadingSnapshot}
          className="text-xs font-mono text-gray-400"
        />
        {uploadingSnapshot && <p className="text-xs font-mono text-amber mt-1">Uploading...</p>}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <button type="button" onClick={() => setShowEmotion((s) => !s)} className="text-xs font-mono text-gray-500 hover:text-amber">
          {showEmotion ? '− Hide emotion notes' : '+ Add emotion notes'}
        </button>
        {showEmotion && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Emotion before entry">
              <input value={trade.emotion?.emotionBeforeEntry || ''} onChange={setEmotion('emotionBeforeEntry')} className="input" placeholder="Calm, anxious..." />
            </Field>
            <Field label="Emotion during trade">
              <input value={trade.emotion?.emotionDuringTrade || ''} onChange={setEmotion('emotionDuringTrade')} className="input" placeholder="Nervous, confident..." />
            </Field>
            <Field label="Emotion after close">
              <input value={trade.emotion?.emotionAfterClose || ''} onChange={setEmotion('emotionAfterClose')} className="input" placeholder="Relieved, frustrated..." />
            </Field>
            <Field label="Urge to break rules?">
              <div className="flex gap-2 max-w-[160px]">
                <button type="button" onClick={() => setUrgeToBreakRules(true)} className={`flex-1 py-2 rounded-md text-xs font-mono border ${trade.emotion?.urgeToBreakRules === true ? 'bg-red/20 border-red text-red' : 'border-border text-gray-500'}`}>Yes</button>
                <button type="button" onClick={() => setUrgeToBreakRules(false)} className={`flex-1 py-2 rounded-md text-xs font-mono border ${trade.emotion?.urgeToBreakRules === false ? 'bg-green/20 border-green text-green' : 'border-border text-gray-500'}`}>No</button>
              </div>
            </Field>
            {trade.emotion?.urgeToBreakRules === true && (
              <div className="md:col-span-2">
                <Field label="What triggered it">
                  <input value={trade.emotion?.whatTriggeredIt || ''} onChange={setEmotion('whatTriggeredIt')} className="input" placeholder="FOMO, boredom..." autoFocus />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function isCustomMethod(method, setupOptions) {
  return !!method && setupOptions.length > 0 && !setupOptions.includes(method);
}

function hasEmotionContent(emotion = {}) {
  return !!(emotion.emotionBeforeEntry || emotion.emotionDuringTrade || emotion.emotionAfterClose || emotion.whatTriggeredIt);
}

function MethodPicker({ method, setupOptions, showCustom, onSelect, onEnterCustom, onBackToList }) {
  if (showCustom) {
    return (
      <div className="flex gap-1.5">
        <input value={method || ''} onChange={(e) => onSelect(e.target.value)} className="input" placeholder="Type a custom setup name" autoFocus />
        <button type="button" onClick={onBackToList} className="text-xs font-mono text-gray-500 hover:text-white px-2" title="Back to list">
          ↩
        </button>
      </div>
    );
  }
  return (
    <select
      value={setupOptions.includes(method) ? method : ''}
      onChange={(e) => (e.target.value === '__custom__' ? onEnterCustom() : onSelect(e.target.value))}
      className="input"
    >
      <option value="" disabled>Select a setup...</option>
      {setupOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      <option value="__custom__">+ Custom setup...</option>
    </select>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
