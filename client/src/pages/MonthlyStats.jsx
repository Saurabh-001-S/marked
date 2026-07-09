import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { downloadPdf } from '../api/downloadPdf';
import JournalNav from '../components/JournalNav';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthlyStats() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [takeaway, setTakeaway] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['monthly', accountId, month],
    queryFn: () => api.get(`/accounts/${accountId}/monthly`, { params: { month } }).then((r) => {
      setTakeaway(r.data.monthlyTakeaway || '');
      return r.data;
    }),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/accounts/${accountId}/monthly`, { month, monthlyTakeaway: takeaway }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthly', accountId, month] }),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ setupType, decision }) => api.put('/setup-preferences', { setupType, decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthly', accountId, month] }),
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadPdf(`/accounts/${accountId}/monthly/pdf?month=${month}`, `monthly-stats-${month}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => navigate(-1)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">&larr; back</button>
            <h1 className="font-display text-lg font-semibold">Monthly Stats Summary</h1>
          </div>
          <div className="flex items-center gap-3">
            <JournalNav accountId={accountId} />
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto text-xs py-2" />
            <button onClick={handleDownload} disabled={downloading} className="border border-border text-xs font-mono px-3 py-2 rounded-md hover:border-gray-500 disabled:opacity-50">
              {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : 'Save Month'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <p className="font-mono text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <Section title="Core Numbers">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Stat label="Total Trades" value={data.core.totalTrades} />
                <Stat label="Win Rate" value={data.core.winRate != null ? `${data.core.winRate.toFixed(1)}%` : '—'} />
                <Stat label="Avg R:R" value={data.core.avgRR != null ? `1:${data.core.avgRR.toFixed(1)}` : '—'} />
                <Stat label="Net R" value={data.core.netR.toFixed(1)} accent={data.core.netR >= 0 ? 'green' : 'red'} />
                <Stat label="Profit Factor" value={data.core.profitFactor != null ? data.core.profitFactor.toFixed(2) : '—'} />
                <Stat label="Max Drawdown" value={`${data.core.maxDrawdown.toFixed(1)}%`} accent="red" />
              </div>
            </Section>

            <Section title="Balance Tracking">
              <TableShell headers={['Week', 'Start Bal', 'End Bal', 'Net R', 'Net P/L', 'Rule Breaks']}>
                {data.weeks.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500 font-mono text-xs">No trading days logged this month yet.</td></tr>
                ) : data.weeks.map((w) => (
                  <tr key={w.weekStarting} className="border-b border-border last:border-b-0 font-mono text-sm">
                    <td className="px-4 py-3">{w.label}</td>
                    <td className="px-4 py-3">${w.startBalance?.toLocaleString()}</td>
                    <td className="px-4 py-3">${w.endBalance?.toLocaleString()}</td>
                    <td className="px-4 py-3">{w.netR.toFixed(1)}</td>
                    <td className="px-4 py-3">${w.netPnl.toFixed(2)}</td>
                    <td className={w.ruleBreaks > 0 ? 'px-4 py-3 text-red' : 'px-4 py-3'}>{w.ruleBreaks}</td>
                  </tr>
                ))}
              </TableShell>
            </Section>

            <Section title="Setup Performance Breakdown">
              <TableShell headers={['Setup', 'Times Taken', 'Win %', 'Avg R:R', 'Net R', 'Keep / Drop']}>
                {data.setupBreakdown.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500 font-mono text-xs">No trades with a method tagged yet.</td></tr>
                ) : data.setupBreakdown.map((s) => (
                  <tr key={s.setupType} className="border-b border-border last:border-b-0 font-mono text-sm">
                    <td className="px-4 py-3">{s.setupType}</td>
                    <td className="px-4 py-3">{s.timesTaken}</td>
                    <td className="px-4 py-3">{s.winRate != null ? `${s.winRate.toFixed(0)}%` : '—'}</td>
                    <td className="px-4 py-3">{s.avgRR != null ? s.avgRR.toFixed(1) : '—'}</td>
                    <td className="px-4 py-3">{s.netR.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {['KEEP', 'DROP'].map((d) => (
                          <button
                            key={d}
                            onClick={() => decisionMutation.mutate({ setupType: s.setupType, decision: d })}
                            className={`px-2.5 py-1 rounded text-[10px] border ${
                              s.decision === d ? (d === 'KEEP' ? 'bg-green/20 border-green text-green' : 'bg-red/20 border-red text-red') : 'border-border text-gray-500'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </TableShell>
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Section title="Discipline Scorecard">
                <div className="bg-panel border border-border rounded-lg p-5 space-y-3 font-mono text-sm">
                  <Row label="Days exceeded 2-trade max" value={data.discipline.daysExceededMaxTrades} />
                  <Row label="Days exceeded daily loss limit" value={data.discipline.daysExceededLossLimit} />
                  <Row label="Trades without COT confirmation" value={data.discipline.tradesWithoutCot} />
                  <Row label="Avg discipline score" value={data.discipline.avgDisciplineScore != null ? data.discipline.avgDisciplineScore.toFixed(1) : '—'} />
                </div>
              </Section>
              <Section title="Challenge Status">
                <div className="bg-panel border border-border rounded-lg p-5 space-y-3 font-mono text-sm">
                  <Row label="Profit target progress" value={data.challengeStatus.profitTargetProgress != null ? `${data.challengeStatus.profitTargetProgress.toFixed(0)}%` : '—'} />
                  <Row label="Distance to drawdown limit" value={data.challengeStatus.distanceToDrawdownLimit != null ? `${data.challengeStatus.distanceToDrawdownLimit.toFixed(1)}%` : '—'} />
                  <Row label="Min trading days completed" value={`${data.challengeStatus.tradingDaysCompleted} / ${data.challengeStatus.minTradingDays ?? '—'}`} />
                  <Row
                    label="On pace to pass?"
                    value={data.challengeStatus.onPaceToPassPhase == null ? '—' : data.challengeStatus.onPaceToPassPhase ? 'Yes' : 'No'}
                    accent={data.challengeStatus.onPaceToPassPhase === false ? 'red' : data.challengeStatus.onPaceToPassPhase === true ? 'green' : undefined}
                  />
                </div>
              </Section>
            </div>

            <Section title="Monthly Takeaway">
              <textarea
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
                placeholder="Key learning this month, mindset shifts, what changed in your process..."
                className="input h-28 resize-none"
              />
            </Section>

            <div className="flex justify-end pb-10">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : 'Save Month'}
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
  const color = accent === 'green' ? 'text-green' : accent === 'red' ? 'text-red' : 'text-white';
  return (
    <div className="bg-panel border border-border rounded-md px-3 py-3">
      <div className="text-[9px] font-mono uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className={`font-mono text-base font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function TableShell({ headers, children }) {
  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wide text-gray-500">
            {headers.map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ label, value, accent }) {
  const color = accent === 'green' ? 'text-green' : accent === 'red' ? 'text-red' : 'text-white';
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
