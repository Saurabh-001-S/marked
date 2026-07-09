export default function ScalePicker({ label, value, onChange }) {
  return (
    <div>
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-2">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-full text-xs font-mono border transition-colors ${
              value === n ? 'bg-amber text-[#1A1305] border-amber font-semibold' : 'border-border text-gray-400 hover:border-gray-500'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
