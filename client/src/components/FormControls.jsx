// Small, presentational form primitives shared across the journal pages.
// None of these hold state or know about the API — they're pure UI, which
// is what makes them safe to reuse between Daily Log and Emotion Tracker
// without coupling those two pages together.

export function Section({ title, children }) {
  return (
    <section className="mb-8">
      <div className="border-l-2 border-amber pl-3 mb-4">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-gray-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function TextField({ label, value, onChange, type = 'text', textarea, tall, placeholder }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input ${tall ? 'h-24' : 'h-16'} resize-none`}
        />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
      )}
    </label>
  );
}

export function YesNo({ label, value, onChange, compact, invert = false }) {
  const yesActiveClass = invert ? 'bg-green/20 border-green text-green' : 'bg-red/20 border-red text-red';
  const noActiveClass = invert ? 'bg-red/20 border-red text-red' : 'bg-green/20 border-green text-green';
  return (
    <div>
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      <div className={`flex gap-2 ${compact ? 'max-w-[160px]' : ''}`}>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 py-2 rounded-md text-xs font-mono border ${value === true ? yesActiveClass : 'border-border text-gray-500'}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 py-2 rounded-md text-xs font-mono border ${value === false ? noActiveClass : 'border-border text-gray-500'}`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function StatBox({ label, value, accent }) {
  const color = accent === 'green' ? 'text-green' : accent === 'red' ? 'text-red' : 'text-white';
  return (
    <div className="bg-panel border border-border rounded-md px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
