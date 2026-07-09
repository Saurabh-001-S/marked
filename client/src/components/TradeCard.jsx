import { useState } from 'react';

const DIRECTIONS = ['LONG', 'SHORT'];
const PLAN_OPTIONS = ['YES', 'NO', 'NA'];

export default function TradeCard({ trade, index, onChange, onRemove, setupOptions = [] }) {
  const set = (field) => (e) => onChange(index, { ...trade, [field]: e.target.value });
  const isCustomMethod = trade.method && !setupOptions.includes(trade.method);
  const [showCustomInput, setShowCustomInput] = useState(isCustomMethod);

  return (
    <div className="bg-panel border border-border rounded-lg p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wide text-amber">TRADE {index + 1}</h3>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-xs font-mono text-gray-500 hover:text-red transition-colors"
        >
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
          <input type="number" step="0.00001" value={trade.entry || ''} onChange={set('entry')} className="input" placeholder="—" />
        </Field>
        <Field label="Stop Loss">
          <input type="number" step="0.00001" value={trade.stopLoss || ''} onChange={set('stopLoss')} className="input" placeholder="—" />
        </Field>
        <Field label="Take P/L PIPs">
          <input type="number" step="0.00001" value={trade.takeProfit || ''} onChange={set('takeProfit')} className="input" placeholder="—" />
        </Field>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <Field label="Lot Size">
          <input type="number" step="0.01" value={trade.lotSize || ''} onChange={set('lotSize')} className="input" placeholder="—" />
        </Field>
        <Field label="R:R">
          <input value={trade.riskReward || ''} onChange={set('riskReward')} className="input" placeholder="e.g. 1:2" />
        </Field>
        <Field label="Method">
          {showCustomInput ? (
            <div className="flex gap-1.5">
              <input
                value={trade.method || ''}
                onChange={set('method')}
                className="input"
                placeholder="Type a custom setup name"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); onChange(index, { ...trade, method: '' }); }}
                className="text-xs font-mono text-gray-500 hover:text-white px-2"
                title="Back to list"
              >
                ↩
              </button>
            </div>
          ) : (
            <select
              value={setupOptions.includes(trade.method) ? trade.method : ''}
              onChange={(e) => {
                if (e.target.value === '__custom__') { setShowCustomInput(true); onChange(index, { ...trade, method: '' }); }
                else onChange(index, { ...trade, method: e.target.value });
              }}
              className="input"
            >
              <option value="" disabled>Select a setup...</option>
              {setupOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              <option value="__custom__">+ Custom setup...</option>
            </select>
          )}
        </Field>
        <Field label="COT Signal">
          <input value={trade.cotSignal || ''} onChange={set('cotSignal')} className="input" placeholder="Bull / Bear" />
        </Field>
        <Field label="Result (R)">
          <input type="number" step="0.1" value={trade.resultR ?? ''} onChange={set('resultR')} className="input" placeholder="—" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
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
                  trade.followedPlan === opt
                    ? 'bg-amber text-[#1A1305] border-amber font-semibold'
                    : 'border-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
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
