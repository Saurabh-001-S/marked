import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { downloadPdf } from '../api/downloadPdf';
import TradeCard from '../components/TradeCard';
import JournalNav from '../components/JournalNav';
import { uploadChartSnapshot } from '../api/uploadSnapshot';

const emptyTrade = () => ({ direction: 'LONG', followedPlan: 'NA' });

function addDays(dateStr, delta) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
const today = new Date().toISOString().slice(0, 10);

export default function DailyLog() {
  const { accountId, date } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    accountBalance: '',
    dayNumberInChallenge: '',
    newsEvents: '',
    preSessionBiasHtf: '',
    keyVpLevels: '',
  });
  const [trades, setTrades] = useState([emptyTrade()]);
  const [endOfDay, setEndOfDay] = useState({
    dailyLossLimitHit: false,
    whatWorkedToday: '',
    whatToFixTomorrow: '',
    oneLineLesson: '',
    chartSnapshotUrl: '',
  });



  const { data: existingLog, isLoading } = useQuery({
    queryKey: ['dailyLog', accountId, date],
    queryFn: () => api.get(`/accounts/${accountId}/daily-logs/${date}`).then((r) => r.data),
    retry: false,
  });

  const { data: setupPreferences } = useQuery({
    queryKey: ['setupOptions'],
    queryFn: () => api.get('/setup-preferences').then((r) => r.data),
  });
  const setupOptions = setupPreferences?.map((p) => p.setupType) ?? [];

  useEffect(() => {
    if (!existingLog) return;
    setForm({
      accountBalance: existingLog.accountBalance ?? '',
      dayNumberInChallenge: existingLog.dayNumberInChallenge ?? '',
      newsEvents: existingLog.newsEvents ?? '',
      preSessionBiasHtf: existingLog.preSessionBiasHtf ?? '',
      keyVpLevels: existingLog.keyVpLevels ?? '',
    });
    setTrades(existingLog.trades?.length ? existingLog.trades : [emptyTrade()]);
    setEndOfDay({
      dailyLossLimitHit: existingLog.dailyLossLimitHit ?? false,
      whatWorkedToday: existingLog.whatWorkedToday ?? '',
      whatToFixTomorrow: existingLog.whatToFixTomorrow ?? '',
      
     chartSnapshotUrl: existingLog.chartSnapshotUrl ?? '',
      oneLineLesson: existingLog.oneLineLesson ?? '',
    });
  }, [existingLog]);

  const totalTrades = trades.filter((t) => t.entry).length;
  const netR = trades.reduce((sum, t) => sum + (Number(t.resultR) || 0), 0);
  const withinMaxTrades = totalTrades <= 2;

function isTradeEmpty(t) {
   return !t.entry && !t.stopLoss && !t.takeProfit && !t.lotSize && !t.riskReward &&
          !t.method && !t.cotSignal && !t.resultR && !t.pnl &&
          !t.setupDescription && !t.domConfirmation;
 }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/accounts/${accountId}/daily-logs`, {
        date,
        accountBalance: Number(form.accountBalance) || 0,
        dayNumberInChallenge: Number(form.dayNumberInChallenge) || null,
        newsEvents: form.newsEvents,
        preSessionBiasHtf: form.preSessionBiasHtf,
        keyVpLevels: form.keyVpLevels,
        trades: trades
          // .filter((t) => t.entry || t.setupDescription) // skip fully-empty rows
          .filter((t) => !isTradeEmpty(t)) // skip rows where literally nothing was entere
          .map((t) => ({ ...t, entry: num(t.entry), stopLoss: num(t.stopLoss), takeProfit: num(t.takeProfit), lotSize: num(t.lotSize), resultR: num(t.resultR), pnl: num(t.pnl) })),
        endOfDay: { ...endOfDay, stayedWithinMaxTrades: withinMaxTrades },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyLog', accountId, date] });
      queryClient.invalidateQueries({ queryKey: ['setupOptions'] });
    },
  });

  function updateTrade(index, updated) {
    setTrades((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }
  function addTrade() {
    setTrades((prev) => [...prev, emptyTrade()]);
  }
  function removeTrade(index) {
    setTrades((prev) => prev.filter((_, i) => i !== index));
  }

  const [uploadingSnapshot, setUploadingSnapshot] = useState(false);

  async function handleSnapshotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSnapshot(true);
    try {
      const url = await uploadChartSnapshot(accountId, file);
      setEndOfDay((prev) => ({ ...prev, chartSnapshotUrl: url }));
    } catch (err) {
      alert('Upload failed — try a smaller image or check your connection.');
    } finally {
      setUploadingSnapshot(false);
    }
  }

  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadPdf(`/accounts/${accountId}/daily-logs/${date}/pdf`, `daily-log-${date}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500 font-mono text-sm">Loading...</div>;

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
              <button onClick={() => navigate(`/journal/${accountId}/${today}`)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">&larr; back to accounts</button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/journal/${accountId}/${addDays(date, -1)}`)}
                  className="text-gray-500 hover:text-white px-1"
                  title="Previous day"
                >
                  ‹
                </button>
                <h1 className="font-display text-lg font-semibold">{formatDate(date)}</h1>
                <button
                  onClick={() => navigate(`/journal/${accountId}/${addDays(date, 1)}`)}
                  className="text-gray-500 hover:text-white px-1"
                  title="Next day"
                >
                  ›
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && navigate(`/journal/${accountId}/${e.target.value}`)}
                  className="ml-2 bg-transparent border border-border rounded-md px-2 py-1 text-xs font-mono text-gray-400"
                />
              </div>
            </div>
          <div className="flex items-center gap-3">
            <JournalNav accountId={accountId} date={date} />
            <button onClick={handleDownload} disabled={downloading} className="border border-border text-xs font-mono px-3 py-2 rounded-md hover:border-gray-500 disabled:opacity-50">
              {downloading ? 'Preparing...' : 'PDF'}
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Day'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!withinMaxTrades && (
          <div className="bg-red/10 border border-red/30 text-red text-xs font-mono rounded-md px-4 py-3 mb-5">
            You're at {totalTrades} trades — over the 2-trade daily limit. This will be flagged as a rule break in your weekly review.
          </div>
        )}

        <div className="bg-amber/5 border border-amber/20 rounded-md px-4 py-3 mb-6 text-xs font-mono text-amber/90 leading-relaxed">
          MAX 2 TRADES/DAY · RISK 1.5–2% PER TRADE · LONDON SESSION ONLY · NO TRADE WITHOUT A CONFIRMED COT SIGNAL AT A KEY VOLUME PROFILE LEVEL (POC / VAH / VAL / HVN / LVN)
        </div>

        <Section title="Pre-Session Info">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <TopField label="Day # in Challenge" value={form.dayNumberInChallenge} onChange={(v) => setForm({ ...form, dayNumberInChallenge: v })} type="number" />
            <TopField label="Account Balance ($)" value={form.accountBalance} onChange={(v) => setForm({ ...form, accountBalance: v })} type="number" />
            <TopField label="News / Red Folder Events" value={form.newsEvents} onChange={(v) => setForm({ ...form, newsEvents: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopField label="Pre-Session Bias (HTF)" value={form.preSessionBiasHtf} onChange={(v) => setForm({ ...form, preSessionBiasHtf: v })} textarea />
            <TopField label="Key VP Levels Marked" value={form.keyVpLevels} onChange={(v) => setForm({ ...form, keyVpLevels: v })} textarea />
          </div>
        </Section>

        <Section title="Trades">
          {trades.map((t, i) => (
            <TradeCard key={i} trade={t} index={i} onChange={updateTrade} onRemove={removeTrade} setupOptions={setupOptions} />
          ))}
          <button
            type="button"
            onClick={addTrade}
            className="w-full border border-dashed border-border rounded-lg py-3 text-xs font-mono text-gray-500 hover:text-amber hover:border-amber/40 transition-colors"
          >
            + add trade
          </button>
        </Section>

        <Section title="End of Day Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <ReadOnlyStat label="Total Trades Taken" value={totalTrades} />
            <ReadOnlyStat label="Net R for the Day" value={netR.toFixed(1)} accent={netR >= 0 ? 'green' : 'red'} />
            <ToggleField label="Daily Loss Limit Hit?" value={endOfDay.dailyLossLimitHit} onChange={(v) => setEndOfDay({ ...endOfDay, dailyLossLimitHit: v })} />
            <ReadOnlyStat label="Stayed Within Max Trades?" value={withinMaxTrades ? 'Yes' : 'No'} accent={withinMaxTrades ? 'green' : 'red'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <TopField label="What Worked Today" value={endOfDay.whatWorkedToday} onChange={(v) => setEndOfDay({ ...endOfDay, whatWorkedToday: v })} textarea placeholder="Entry precision, patience waiting for setup..." />
            <TopField label="What to Fix Tomorrow" value={endOfDay.whatToFixTomorrow} onChange={(v) => setEndOfDay({ ...endOfDay, whatToFixTomorrow: v })} textarea placeholder="Entered too early before volume confirmation..." />
          </div>

          <div className="mb-4">
            <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Chart Snapshot</span>
              {endOfDay.chartSnapshotUrl && (
                <img src={endOfDay.chartSnapshotUrl} alt="Chart snapshot" className="rounded-md border border-border mb-2 max-h-64" />
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSnapshotUpload} disabled={uploadingSnapshot} className="text-xs font-mono text-gray-400" />
              {uploadingSnapshot && <p className="text-xs font-mono text-amber mt-1">Uploading...</p>}
          </div>
          {/* <TopField label="Setup Sketch Notes (mark entry, SL, TP, key VP levels)" value={endOfDay.chartSnapshotNotes} onChange={(v) => setEndOfDay({ ...endOfDay, chartSnapshotNotes: v })} textarea tall /> */}
          
          <div className="mt-4">
            <TopField label="One-Line Lesson to Carry Into Tomorrow's Session" value={endOfDay.oneLineLesson} onChange={(v) => setEndOfDay({ ...endOfDay, oneLineLesson: v })} placeholder="Always wait for the second touch of the POC before entering..." />
          </div>
        </Section>

        <div className="flex justify-end pb-10">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Day'}
          </button>
        </div>
      </main>
    </div>
  );
}

function num(v) {
  return v === '' || v === undefined || v === null ? null : Number(v);
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

function TopField({ label, value, onChange, type = 'text', textarea, tall, placeholder }) {
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

function ReadOnlyStat({ label, value, accent }) {
  const color = accent === 'green' ? 'text-green' : accent === 'red' ? 'text-red' : 'text-white';
  return (
    <div className="bg-panel border border-border rounded-md px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function ToggleField({ label, value, onChange }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 py-2 rounded-md text-xs font-mono border ${value ? 'bg-red/20 border-red text-red' : 'border-border text-gray-500'}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 py-2 rounded-md text-xs font-mono border ${!value ? 'bg-green/20 border-green text-green' : 'border-border text-gray-500'}`}
        >
          No
        </button>
      </div>
    </div>
  );
}
