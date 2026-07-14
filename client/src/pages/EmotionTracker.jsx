import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import JournalNav from '../components/JournalNav';
import ScalePicker from '../components/ScalePicker';
import { Section, TextField, YesNo } from '../components/FormControls';

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

const emptyPreSession = { sleepQuality: null, mentalClarity: null, confidenceInPlan: null, morningRoutineDone: false, externalStress: '', physicalState: '' };
const emptyPostSession = { overallEmotionalState: null, steppedAwayAfterClose: null, windDownUsed: null, carryoverThoughts: '', reflectionNotes: '' };

export default function EmotionTracker() {
  const { accountId, date } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [preSession, setPreSession] = useState(emptyPreSession);
  const [postSession, setPostSession] = useState(emptyPostSession);
  const [checklist, setChecklist] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['emotionLog', accountId, date],
    queryFn: () => api.get(`/accounts/${accountId}/daily-logs/${date}/emotion`).then((r) => r.data),
  });

  useEffect(() => {
    const log = data?.emotionLog;
    if (!log) {
      setPreSession(emptyPreSession);
      setPostSession(emptyPostSession);
      setChecklist({});
      return;
    }
    setPreSession({
      sleepQuality: log.sleepQuality,
      mentalClarity: log.mentalClarity,
      confidenceInPlan: log.confidenceInPlan,
      morningRoutineDone: log.morningRoutineDone,
      externalStress: log.externalStress || '',
      physicalState: log.physicalState || '',
    });
    setPostSession({
      overallEmotionalState: log.overallEmotionalState,
      steppedAwayAfterClose: log.steppedAwayAfterClose,
      windDownUsed: log.windDownUsed,
      carryoverThoughts: log.carryoverThoughts || '',
      reflectionNotes: log.reflectionNotes || '',
    });
    setChecklist(log.disciplineChecklist || {});
  }, [data]);

  const checkedCount = Object.values(checklist).filter(Boolean).length;

  // Note: tradeEmotions is deliberately NOT sent from here. Per-trade
  // emotion is edited on the Daily Log page (right on each TradeCard) —
  // keeping it editable in two places would mean whichever page saves last
  // silently overwrites the other's changes.
  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/accounts/${accountId}/daily-logs/${date}/emotion`, {
        preSession,
        postSession,
        disciplineChecklist: checklist,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emotionLog', accountId, date] }),
  });

  if (isLoading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-gray-500 font-mono text-sm">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <button onClick={() => navigate(-1)} className="font-mono text-xs text-gray-500 hover:text-white mb-1">&larr; back</button>
            <h1 className="font-display text-lg font-semibold">Emotion &amp; Discipline — {formatDate(date)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <JournalNav accountId={accountId} date={date} />
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Section title="Pre-Session State (before London open)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="bg-panel border border-border rounded-lg px-4 py-3 mb-8 text-xs font-mono text-gray-400">
          Looking for per-trade emotion (before/during/after each trade)? That's now on the{' '}
          <Link to={`/journal/${accountId}/${date}`} className="text-amber hover:underline">Daily Log</Link> page — right on each trade card.
        </div>

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
            textarea
            tall
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
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50">
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
