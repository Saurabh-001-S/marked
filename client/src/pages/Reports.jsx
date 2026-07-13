import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { downloadPdf } from '../api/downloadPdf';
import JournalNav from '../components/JournalNav';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Trade Log', desc: 'Trade entries, EOD summary, one-line lesson' },
  { id: 'weekly', label: 'Weekly Review', desc: 'Week at a glance, stats, challenge progress' },
  { id: 'monthly', label: 'Monthly Stats', desc: 'Core numbers, balance tracking, setup breakdown' },
];

function mondayOf(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(today);
  const [downloading, setDownloading] = useState(false);

  const { data } = useQuery({
    queryKey: ['reportsSummary', accountId],
    queryFn: () => api.get(`/accounts/${accountId}/reports/summary`).then((r) => r.data),
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      if (reportType === 'daily') {
        await downloadPdf(`/accounts/${accountId}/daily-logs/${date}/pdf`, `daily-log-${date}.pdf`);
      } else if (reportType === 'weekly') {
        const weekStarting = mondayOf(date);
        await downloadPdf(`/accounts/${accountId}/weekly/pdf?weekStarting=${weekStarting}`, `weekly-review-${weekStarting}.pdf`);
      } else {
        const month = date.slice(0, 7);
        await downloadPdf(`/accounts/${accountId}/monthly/pdf?month=${month}`, `monthly-stats-${month}.pdf`);
      }
    } catch {
      alert('No data found for that period, or something went wrong generating the PDF.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">&larr; back</button>
            <h1 className="font-display text-lg font-semibold">Reports</h1>
          </div>
          <JournalNav accountId={accountId} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 mb-6">Download your journal data as PDF</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Daily Logs" value={data?.dailyLogCount ?? '—'} accent="blue" />
          <StatCard label="Weekly Reviews" value={data?.weeklyReviewCount ?? '—'} accent="green" />
          <StatCard label="Monthly Records" value={data?.monthlyRecordCount ?? '—'} />
        </div>

        <Section title="Select Report Type">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setReportType(rt.id)}
                className={`text-left p-5 rounded-lg border transition-colors ${
                  reportType === rt.id ? 'border-amber bg-amber/5' : 'border-border bg-panel hover:border-gray-600'
                }`}
              >
                <div className={`font-display font-semibold mb-1 ${reportType === rt.id ? 'text-amber' : 'text-white'}`}>{rt.label}</div>
                <div className="text-xs text-gray-500">{rt.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Select Period">
          <label className="block mb-4">
            <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Select Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
          </label>
          {data?.recentDailyLogs?.length > 0 && (
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-2">Or pick from saved logs</span>
              <div className="flex flex-wrap gap-2">
                {data.recentDailyLogs.map((log) => {
                  const d = log.date.slice(0, 10);
                  return (
                    <button
                      key={d}
                      onClick={() => setDate(d)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono border ${
                        date === d ? 'bg-amber text-[#1A1305] border-amber font-semibold' : 'border-border text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {formatShort(d)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        <div className="bg-panel border border-border rounded-lg p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="font-display font-semibold">{REPORT_TYPES.find((r) => r.id === reportType)?.label} PDF</div>
            <div className="text-xs text-gray-500 font-mono">Date: {formatShort(date)}</div>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {downloading ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>

        <Section title="Recent Daily Logs">
          <div className="bg-panel border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Account Balance</th>
                  <th className="px-4 py-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentDailyLogs?.map((log) => {
                  const d = log.date.slice(0, 10);
                  return (
                    <tr key={d} className="border-b border-border last:border-b-0 font-mono">
                      <td className="px-4 py-3">{formatShort(d)}</td>
                      <td className="px-4 py-3">${log.accountBalance?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => downloadPdf(`/accounts/${accountId}/daily-logs/${d}/pdf`, `daily-log-${d}.pdf`)}
                          className="text-amber hover:underline text-xs"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!data?.recentDailyLogs?.length && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500 font-mono text-xs">No daily logs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </main>
    </div>
  );
}

function formatShort(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

function StatCard({ label, value, accent }) {
  const color = accent === 'blue' ? 'text-blue-400' : accent === 'green' ? 'text-green' : 'text-white';
  return (
    <div className="bg-panel border border-border rounded-lg p-5 text-center">
      <div className={`font-display text-3xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}