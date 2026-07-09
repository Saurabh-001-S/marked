import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import JournalNav from '../components/JournalNav';
import ScalePicker from '../components/ScalePicker';

const CHECKLIST_ITEMS = [
  ['waitedForSessionWindow', 'Waited for London session window only'],
  ['didNotExceedMaxTrades', 'Did not exceed 2 trades today'],
  ['riskSizedCorrectly', 'Risk sized at 1.5–2% per trade'],
  ['confirmedCotSignal', 'Confirmed COT signal at key VP level before entry'],
  ['checkedDomForSpoofing', 'Checked DOM for spoofing / imbalance before entry'],
  ['noRevengeTrading', 'No revenge trading after a loss'],
  ['noMovingStopLoss', 'No moving stop loss once placed'],
  ['stoppedAfterLossLimit', 'Stopped trading after hitting daily loss limit'],
  ['journaledWithin30Min', 'Journaled trade within 30 min of close'],
  ['stuckToPlanWhenBored', 'Stuck to plan even when bored/impatient'],
];

export default function EmotionTracker() {
  const { accountId, date } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [preSession, setPreSession] = useState({
    sleepQuality: null, mentalClarity: null, confidenceInPlan: null,
    morningRoutineDone: false, externalStress: '', physicalState: '',
  });
  const [postSession, setPostSession] = useState({
    overallEmotionalState: null, steppedAwayAfterClose: null, windDownUsed: null,
    carryoverThoughts: '', reflectionNotes: '',
  });
  const [checklist, setChecklist] = useState({});
  const [tradeEmotions, setTradeEmotions] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['emotionLog', accountId, date],
    queryFn: () => api.get(`/accounts/${accountId}/daily-logs/${date}/emotion`).then((r) => r.data),
  });

  useEffect(() => {
    if (!data) return;
    if (data.emotionLog) {
      const e = data.emotionLog;
      setPreSession({
        sleepQuality: e.sleepQuality, mentalClarity: e.mentalClarity, confidenceInPlan: e.confidenceInPlan,
        morningRoutineDone: e.morningRoutineDone, externalStress: e.externalStress || '', physicalState: e.physicalState || '',
      });
      setPostSession({
        overallEmotionalState: e.overallEmotionalState, steppedAwayAfterClose: e.steppedAwayAfterClose,
        windDownUsed: e.windDownUsed, carryoverThoughts: e.carryoverThoughts || '', reflectionNotes: e.reflectionNotes || '',
      });
      setChecklist(e.disciplineChecklist || {});
    }
    if (data.trades) {
      setTradeEmotions(
        data.trades.map((t) => ({
          tradeNumber: t.tradeNumber,
          emotionBeforeEntry: t.emotion?.emotionBeforeEntry || '',
          emotionDuringTrade: t.emotion?.emotionDuringTrade || '',
          emotionAfterClose: t.emotion?.emotionAfterClose || '',
          urgeToBreakRules: t.emotion?.urgeToBreakRules || false,
          whatTriggeredIt: t.emotion?.whatTriggeredIt || '',
        }))
      );
    }
  }, [data]);

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/accounts/${accountId}/daily-logs/${date}/emotion`, { preSession, postSession, disciplineChecklist: checklist, tradeEmotions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emotionLog', accountId, date] }),
  });

  function updateTradeEmotion(tradeNumber, field, value) {
    setTradeEmotions((prev) => prev.map((te) => (te.tradeNumber === tradeNumber ? { ...te, [field]: value } : te)));
  }

  if (isLoading) return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500 font-mono text-sm">Loading...</div>;

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">&larr; back</button>
            <h1 className="font-display text-lg font-semibold">Emotion &amp; Discipline — {formatDate(date)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <JournalNav accountId={accountId} date={date} />
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Section title="Pre-Session State (before London open)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-5">
              <ScalePicker label="Sleep quality (last night)" value={preSession.sleepQuality} onChange={(v) => setPreSession({ ...preSession, sleepQuality: v })} />
              <ScalePicker label="Mental clarity / focus" value={preSession.mentalClarity} onChange={(v) => setPreSession({ ...preSession, mentalClarity: v })} />
              <ScalePicker label="Confidence in today's plan" value={preSession.confidenceInPlan} onChange={(v) => setPreSession({ ...preSession, confidenceInPlan: v })} />
            </div>
            <div className="space-y-4">
              <YesNo label="Morning run completed?" value={preSession.morningRoutineDone} onChange={(v) => setPreSession({ ...preSession, morningRoutineDone: v })} />
              <TextField label="Any external stress / distraction today?" value={preSession.externalStress} onChange={(v) => setPreSession({ ...preSession, externalStress: v })} />
              <TextField label="Physical state" value={preSession.physicalState} onChange={(v) => setPreSession({ ...preSession, physicalState: v })} placeholder="Calm, tired, energetic, restless..." />
            </div>
          </div>
        </Section>

        <Section title="During-Trade Emotion Log">
          {tradeEmotions.length === 0 ? (
            <p className="font-mono text-xs text-gray-500 bg-panel border border-border rounded-lg p-5">
              No trades logged for this day yet. Add trades on the Daily Log tab and they'll show up here.
            </p>
          ) : (
            tradeEmotions.map((te) => (
              <div key={te.tradeNumber} className="bg-panel border border-border rounded-lg p-5 mb-4">
                <h3 className="font-display text-sm text-amber mb-3">TRADE {te.tradeNumber}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <TextField label="Emotion before entry" value={te.emotionBeforeEntry} onChange={(v) => updateTradeEmotion(te.tradeNumber, 'emotionBeforeEntry', v)} placeholder="Calm, anxious..." />
                  <TextField label="Emotion during trade" value={te.emotionDuringTrade} onChange={(v) => updateTradeEmotion(te.tradeNumber, 'emotionDuringTrade', v)} placeholder="Nervous, confident..." />
                  <TextField label="Emotion after close" value={te.emotionAfterClose} onChange={(v) => updateTradeEmotion(te.tradeNumber, 'emotionAfterClose', v)} placeholder="Relieved, frustrated..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <YesNo label="Urge to break rules?" value={te.urgeToBreakRules} onChange={(v) => updateTradeEmotion(te.tradeNumber, 'urgeToBreakRules', v)} compact />
                  <div className="md:col-span-2">
                    <TextField label="What triggered it" value={te.whatTriggeredIt} onChange={(v) => updateTradeEmotion(te.tradeNumber, 'whatTriggeredIt', v)} placeholder="FOMO, boredom..." />
                  </div>
                </div>
              </div>
            ))
          )}
        </Section>

        <Section title={`Discipline Checklist — ${checkedCount} / 10`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 bg-panel border border-border rounded-lg p-5">
            {CHECKLIST_ITEMS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 py-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checklist[key]}
                  onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                  className="w-4 h-4 accent-amber"
                />
                <span className="text-sm text-gray-300 group-hover:text-white">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Reflection">
          <TextField
            label="Where did emotion almost override the plan today? What will I do differently next time?"
            value={postSession.reflectionNotes}
            onChange={(v) => setPostSession({ ...postSession, reflectionNotes: v })}
            textarea tall
          />
        </Section>

        <Section title="Post-Session Wind-Down">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <ScalePicker label="Overall emotional state right now (1-10)" value={postSession.overallEmotionalState} onChange={(v) => setPostSession({ ...postSession, overallEmotionalState: v })} />
              <YesNo label="Did I step away from the screen after closing trades?" value={postSession.steppedAwayAfterClose} onChange={(v) => setPostSession({ ...postSession, steppedAwayAfterClose: v })} />
            </div>
            <div className="space-y-4">
              <YesNo label="Evening wind-down used as planned?" value={postSession.windDownUsed} onChange={(v) => setPostSession({ ...postSession, windDownUsed: v })} />
              <TextField label="Anything carrying over into tomorrow's mindset?" value={postSession.carryoverThoughts} onChange={(v) => setPostSession({ ...postSession, carryoverThoughts: v })} />
            </div>
          </div>
        </Section>

        <div className="flex justify-end pb-10">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </main>
    </div>
  );
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

function TextField({ label, value, onChange, placeholder, textarea, tall }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`input ${tall ? 'h-28' : 'h-16'} resize-none`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
      )}
    </label>
  );
}

function YesNo({ label, value, onChange, compact }) {
  return (
    <div>
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      <div className={`flex gap-2 ${compact ? 'max-w-[160px]' : ''}`}>
        <button type="button" onClick={() => onChange(true)} className={`flex-1 py-2 rounded-md text-xs font-mono border ${value === true ? 'bg-red/20 border-red text-red' : 'border-border text-gray-500'}`}>Yes</button>
        <button type="button" onClick={() => onChange(false)} className={`flex-1 py-2 rounded-md text-xs font-mono border ${value === false ? 'bg-green/20 border-green text-green' : 'border-border text-gray-500'}`}>No</button>
      </div>
    </div>
  );
}
