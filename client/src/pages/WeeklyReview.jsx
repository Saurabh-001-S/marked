import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { downloadPdf } from '../api/downloadPdf';
import JournalNav from '../components/JournalNav';

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

export default function WeeklyReview() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [weekStarting, setWeekStarting] = useState(mondayOf(new Date()));
  const [reflection, setReflection] = useState({ whatWorkedThisWeek: '', whatDidntWork: '', oneChangeForNextWeek: '', onTrackForTarget: null });
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['weekly', accountId, weekStarting],
    queryFn: () => api.get(`/accounts/${accountId}/weekly`, { params: { weekStarting } }).then((r) => {
      const d = r.data;
      setReflection({
        whatWorkedThisWeek: d.reflection?.whatWorkedThisWeek || '',
        whatDidntWork: d.reflection?.whatDidntWork || '',
        oneChangeForNextWeek: d.reflection?.oneChangeForNextWeek || '',
        onTrackForTarget: d.onTrackForTarget,
      });
      return d;
    }),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/accounts/${accountId}/weekly`, { weekStarting, ...reflection }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly', accountId, weekStarting] }),
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadPdf(`/accounts/${accountId}/weekly/pdf?weekStarting=${weekStarting}`, `weekly-review-${weekStarting}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => navigate(-1)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">&larr; back</button>
            <h1 className="font-display text-lg font-semibold">Weekly Review</h1>
          </div>
          <div className="flex items-center gap-3">
            <JournalNav accountId={accountId} />
            <input type="date" value={weekStarting} onChange={(e) => setWeekStarting(mondayOf(e.target.value))} className="input w-auto text-xs py-2" />
            <button onClick={handleDownload} disabled={downloading} className="border border-border text-xs font-mono px-3 py-2 rounded-md hover:border-gray-500 disabled:opacity-50">
              {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : 'Save Week'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <p className="font-mono text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <Section title="Week at a Glance">
              <div className="bg-panel border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Day</th><th className="px-4 py-3">Trades</th><th className="px-4 py-3">Wins</th>
                      <th className="px-4 py-3">Losses</th><th className="px-4 py-3">Net R</th><th className="px-4 py-3">Net P/L</th><th className="px-4 py-3">Rules?</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {days.map((label, i) => {
                      const d = data?.days?.[i];
                      return (
                        <tr key={label} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-3 text-gray-400">{label}</td>
                          <td className="px-4 py-3">{d?.trades ?? 0}</td>
                          <td className="px-4 py-3 text-green">{d?.wins ?? 0}</td>
                          <td className="px-4 py-3 text-red">{d?.losses ?? 0}</td>
                          <td className="px-4 py-3">{d ? d.netR.toFixed(1) : '—'}</td>
                          <td className="px-4 py-3">{d ? `$${d.netPnl.toFixed(2)}` : '—'}</td>
                          <td className={d?.rulesFollowed === false ? 'px-4 py-3 text-red' : 'px-4 py-3 text-green'}>{d ? (d.rulesFollowed ? 'Y' : 'N') : '—'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-black/20 font-semibold">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3">{data?.totals.trades}</td>
                      <td className="px-4 py-3 text-green">{data?.totals.wins}</td>
                      <td className="px-4 py-3 text-red">{data?.totals.losses}</td>
                      <td className="px-4 py-3 text-amber">{data?.totals.netR.toFixed(1)}</td>
                      <td className="px-4 py-3 text-amber">${data?.totals.netPnl.toFixed(2)}</td>
                      <td className="px-4 py-3">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Weekly Stats">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Win rate" value={data?.winRate != null ? `${data.winRate.toFixed(1)}%` : '—'} />
                <Stat label="Total trades" value={data?.totals.trades} />
                <Stat label="Starting balance" value={`$${data?.startBalance?.toLocaleString()}`} />
                <Stat label="Ending balance" value={`$${data?.endBalance?.toLocaleString()}`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stat label="Urge to break rules (trades)" value={data?.urgeToBreakRulesCount ?? 0} accent={data?.urgeToBreakRulesCount > 0 ? 'red' : undefined} />
                {data?.triggers?.length > 0 && (
                  <div className="bg-panel border border-border rounded-md px-4 py-3">
                    <div className="text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1">Common triggers this week</div>
                    <div className="text-sm text-gray-300">{data.triggers.join(', ')}</div>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Challenge Progress">
              <div className="bg-panel border border-border rounded-lg p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-400">
                  Profit target: <span className="text-white font-mono">{data?.account?.profitTargetPercent ? `${data.account.profitTargetPercent}%` : 'not set'}</span>
                </div>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => setReflection({ ...reflection, onTrackForTarget: v })}
                      className={`px-4 py-2 rounded-md text-xs font-mono border ${
                        reflection.onTrackForTarget === v ? (v ? 'bg-green/20 border-green text-green' : 'bg-red/20 border-red text-red') : 'border-border text-gray-500'
                      }`}
                    >
                      On track: {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Reflection">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextArea label="What worked this week" value={reflection.whatWorkedThisWeek} onChange={(v) => setReflection({ ...reflection, whatWorkedThisWeek: v })} />
                <TextArea label="What didn't work / recurring mistakes" value={reflection.whatDidntWork} onChange={(v) => setReflection({ ...reflection, whatDidntWork: v })} />
                <TextArea label="One change for next week" value={reflection.oneChangeForNextWeek} onChange={(v) => setReflection({ ...reflection, oneChangeForNextWeek: v })} />
              </div>
            </Section>

            <div className="flex justify-end pb-10">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : 'Save Week'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <div className="border-l-2 border-amber pl-3 mb-4">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-gray-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, accent }) {
  const color = accent === 'red' ? 'text-red' : accent === 'green' ? 'text-green' : 'text-white';
  return (
    <div className="bg-panel border border-border rounded-md px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${color}`}>{value ?? '—'}</div>
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="input h-24 resize-none" />
    </label>
  );
}
