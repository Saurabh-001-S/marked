import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

const MAX_TRADES_PER_DAY = 2;

const emptyTrade = () => ({ direction: 'LONG', followedPlan: 'NA', emotion: {} });
const emptyTopFields = { accountBalance: '', dayNumberInChallenge: '', newsEvents: '', preSessionBiasHtf: '', keyVpLevels: '' };
const emptyEndOfDay = { dailyLossLimitHit: false, whatWorkedToday: '', whatToFixTomorrow: '', oneLineLesson: '' };

// Fields other than these two always carry a default value on an untouched
// trade row, so anything else being non-empty means the user actually put
// something in. Generic on purpose — a hardcoded field list here was the
// exact bug that silently dropped trades with a chart snapshot but no entry
// price. Anything new added to Trade in the future is covered automatically.
const TRADE_DEFAULT_FIELDS = ['direction', 'followedPlan', 'emotion'];
function isTradeEmpty(t) {
  return Object.entries(t)
    .filter(([key]) => !TRADE_DEFAULT_FIELDS.includes(key))
    .every(([, value]) => value === '' || value == null);
}

const TRADE_NUMERIC_FIELDS = ['entry', 'stopLoss', 'takeProfit', 'lotSize', 'resultR', 'pnl'];
function coerceTradeNumbers(t) {
  const out = { ...t };
  for (const field of TRADE_NUMERIC_FIELDS) {
    out[field] = out[field] === '' || out[field] == null ? null : Number(out[field]);
  }
  return out;
}

function hasEmotionContent(emotion = {}) {
  return !!(
    emotion.emotionBeforeEntry ||
    emotion.emotionDuringTrade ||
    emotion.emotionAfterClose ||
    emotion.whatTriggeredIt ||
    emotion.urgeToBreakRules != null
  );
}

export function useDailyLog(accountId, date) {
  const queryClient = useQueryClient();

  const [topFields, setTopFields] = useState(emptyTopFields);
  const [trades, setTrades] = useState([emptyTrade()]);
  const [endOfDay, setEndOfDay] = useState(emptyEndOfDay);

  const logQuery = useQuery({
    queryKey: ['dailyLog', accountId, date],
    queryFn: () => api.get(`/accounts/${accountId}/daily-logs/${date}`).then((r) => r.data),
    retry: false,
  });

  const setupOptionsQuery = useQuery({
    queryKey: ['setupOptions'],
    queryFn: () => api.get('/setup-preferences').then((r) => r.data.map((p) => p.setupType)),
  });

  // Re-hydrate local form state whenever the loaded log changes — either a
  // real saved log for this date, or nothing (fresh/never-logged day).
  useEffect(() => {
    const log = logQuery.data;
    if (!log) {
      setTopFields(emptyTopFields);
      setTrades([emptyTrade()]);
      setEndOfDay(emptyEndOfDay);
      return;
    }
    setTopFields({
      accountBalance: log.accountBalance ?? '',
      dayNumberInChallenge: log.dayNumberInChallenge ?? '',
      newsEvents: log.newsEvents ?? '',
      preSessionBiasHtf: log.preSessionBiasHtf ?? '',
      keyVpLevels: log.keyVpLevels ?? '',
    });
    setTrades(
      log.trades?.length
        ? log.trades.map((t) => ({ ...t, emotion: t.emotion || {} }))
        : [emptyTrade()]
    );
    setEndOfDay({
      dailyLossLimitHit: log.dailyLossLimitHit ?? false,
      whatWorkedToday: log.whatWorkedToday ?? '',
      whatToFixTomorrow: log.whatToFixTomorrow ?? '',
      oneLineLesson: log.oneLineLesson ?? '',
    });
  }, [logQuery.data]);

  const activeTrades = useMemo(() => trades.filter((t) => !isTradeEmpty(t)), [trades]);
  const totalTrades = activeTrades.length;
  const netR = useMemo(() => activeTrades.reduce((sum, t) => sum + (Number(t.resultR) || 0), 0), [activeTrades]);
  const withinMaxTrades = totalTrades <= MAX_TRADES_PER_DAY;

  function updateTrade(index, updated) {
    setTrades((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }
  function addTrade() {
    setTrades((prev) => [...prev, emptyTrade()]);
  }
  function removeTrade(index) {
    setTrades((prev) => prev.filter((_, i) => i !== index));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/accounts/${accountId}/daily-logs`, {
        date,
        accountBalance: Number(topFields.accountBalance) || 0,
        dayNumberInChallenge: Number(topFields.dayNumberInChallenge) || null,
        newsEvents: topFields.newsEvents,
        preSessionBiasHtf: topFields.preSessionBiasHtf,
        keyVpLevels: topFields.keyVpLevels,
        trades: activeTrades.map(coerceTradeNumbers),
        endOfDay: { ...endOfDay, stayedWithinMaxTrades: withinMaxTrades },
      });

      // Per-trade emotion isn't a writable Trade column — it's a separate
      // related table — so it's saved through the emotion endpoint, matched
      // by the same 1-based tradeNumber ordering the save above just used.
      const tradeEmotions = activeTrades
        .map((t, i) => ({ tradeNumber: i + 1, ...t.emotion }))
        .filter(hasEmotionContent);

      if (tradeEmotions.length) {
        await api.put(`/accounts/${accountId}/daily-logs/${date}/emotion`, { tradeEmotions });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyLog', accountId, date] });
      queryClient.invalidateQueries({ queryKey: ['setupOptions'] });
    },
  });

  return {
    isLoading: logQuery.isLoading,
    setupOptions: setupOptionsQuery.data ?? [],
    topFields,
    setTopFields,
    trades,
    updateTrade,
    addTrade,
    removeTrade,
    endOfDay,
    setEndOfDay,
    totalTrades,
    netR,
    withinMaxTrades,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
