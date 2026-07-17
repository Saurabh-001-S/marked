import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDailyLog } from '../hooks/useDailyLog';
import { downloadPdf } from '../api/downloadPdf';
import TradeCard from '../components/TradeCard';
import JournalNav from '../components/JournalNav';
import { Section, TextField, YesNo, StatBox } from '../components/FormControls';

function addDays(dateStr, delta) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DailyLog() {
  const { accountId, date } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const {
    isLoading, setupOptions,
    topFields, setTopFields,
    trades, updateTrade, addTrade, removeTrade,
    endOfDay, setEndOfDay,
    totalTrades, netR, withinMaxTrades,
    save, isSaving,
  } = useDailyLog(accountId, date);

  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await downloadPdf(`/accounts/${accountId}/daily-logs/${date}/pdf`, `daily-log-${date}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500 font-mono text-sm">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => navigate(`/journal/${accountId}/${today}`)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">
              &larr; today
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/journal/${accountId}/${addDays(date, -1)}`)} className="text-gray-500 hover:text-white px-1" title="Previous day">‹</button>
              <h1 className="font-display text-lg font-semibold">{formatDate(date)}</h1>
              <button onClick={() => navigate(`/journal/${accountId}/${addDays(date, 1)}`)} className="text-gray-500 hover:text-white px-1" title="Next day">›</button>
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
            <button onClick={handleDownloadPdf} disabled={downloading} className="border border-border text-xs font-mono px-3 py-2 rounded-md hover:border-gray-500 disabled:opacity-50">
              {downloading ? 'Preparing...' : 'PDF'}
            </button>
            <button onClick={save} disabled={isSaving} className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Day'}
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
            <TextField label="Day # in Challenge" value={topFields.dayNumberInChallenge} onChange={(v) => setTopFields({ ...topFields, dayNumberInChallenge: v })} type="number" />
            <TextField label="Account Balance ($)" value={topFields.accountBalance} onChange={(v) => setTopFields({ ...topFields, accountBalance: v })} type="number" />
            <YesNo label="News / Red Folder Events?" value={topFields.newsEvents} onChange={(v) => setTopFields({ ...topFields, newsEvents: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Pre-Session Bias (HTF)</span>
              <div className="flex gap-2">
                {['BULLISH', 'BEARISH', 'NEUTRAL'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTopFields({ ...topFields, preSessionBiasHtf: b })}
                    className={`flex-1 py-2 rounded-md text-xs font-mono border capitalize ${
                      topFields.preSessionBiasHtf === b ? 'bg-amber text-[#1A1305] border-amber font-semibold' : 'border-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {b.charAt(0) + b.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <YesNo label="Key VP Levels Marked?" value={topFields.keyVpLevels} onChange={(v) => setTopFields({ ...topFields, keyVpLevels: v })} />
          </div>
        </Section>

        <Section title="Trades">
          {trades.map((t, i) => (
            <TradeCard key={i} trade={t} index={i} onChange={updateTrade} onRemove={removeTrade} setupOptions={setupOptions} accountId={accountId} />
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
            <StatBox label="Total Trades Taken" value={totalTrades} />
            <StatBox label="Net R for the Day" value={netR.toFixed(1)} accent={netR >= 0 ? 'green' : 'red'} />
            <YesNo label="Daily Loss Limit Hit?" value={endOfDay.dailyLossLimitHit} onChange={(v) => setEndOfDay({ ...endOfDay, dailyLossLimitHit: v })} />
            <YesNo label="Stayed Within Max Trades?" value={endOfDay.stayedWithinMaxTrades} onChange={(v) => setEndOfDay({ ...endOfDay, stayedWithinMaxTrades: v })} invert />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <TextField label="What Worked Today" value={endOfDay.whatWorkedToday} onChange={(v) => setEndOfDay({ ...endOfDay, whatWorkedToday: v })} textarea placeholder="Entry precision, patience waiting for setup..." />
            <TextField label="What to Fix Tomorrow" value={endOfDay.whatToFixTomorrow} onChange={(v) => setEndOfDay({ ...endOfDay, whatToFixTomorrow: v })} textarea placeholder="Entered too early before volume confirmation..." />
          </div>
          <TextField
            label="One-Line Lesson to Carry Into Tomorrow's Session"
            value={endOfDay.oneLineLesson}
            onChange={(v) => setEndOfDay({ ...endOfDay, oneLineLesson: v })}
            placeholder="Always wait for the second touch of the POC before entering..."
          />
        </Section>

        <div className="flex justify-end pb-10">
          <button onClick={save} disabled={isSaving} className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Day'}
          </button>
        </div>
      </main>
    </div>
  );
}
