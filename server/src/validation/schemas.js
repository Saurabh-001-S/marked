import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(200),
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(120),
  startingBalance: z.coerce.number().positive().max(100_000_000),
  profitTargetPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  maxDrawdownPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  minTradingDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
});

const tradeSchema = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  time: z.string().max(20).nullable().optional(),
  entry: z.number().nullable().optional(),
  stopLoss: z.number().nullable().optional(),
  takeProfit: z.number().nullable().optional(),
  lotSize: z.number().nullable().optional(),
  riskReward: z.string().max(20).nullable().optional(),
  method: z.string().max(120).nullable().optional(),
  cotSignal: z.string().max(20).nullable().optional(),
  resultR: z.number().nullable().optional(),
  pnl: z.number().nullable().optional(),
  setupDescription: z.string().max(2000).nullable().optional(),
  domConfirmation: z.string().max(2000).nullable().optional(),
  followedPlan: z.enum(['YES', 'NO', 'NA']).optional(),
});

export const upsertDailyLogSchema = z.object({
  date: z.string().min(1).max(40),
  accountBalance: z.coerce.number().min(0).max(1_000_000_000),
  dayNumberInChallenge: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  newsEvents: z.string().max(1000).nullable().optional(),
  preSessionBiasHtf: z.string().max(2000).nullable().optional(),
  keyVpLevels: z.string().max(1000).nullable().optional(),
  trades: z.array(tradeSchema).max(10).optional(),
  endOfDay: z
    .object({
      dailyLossLimitHit: z.boolean().optional(),
      stayedWithinMaxTrades: z.boolean().optional(),
      whatWorkedToday: z.string().max(2000).nullable().optional(),
      whatToFixTomorrow: z.string().max(2000).nullable().optional(),
      oneLineLesson: z.string().max(500).nullable().optional(),
    })
    .optional(),
});

export const upsertEmotionLogSchema = z.object({
  preSession: z
    .object({
      sleepQuality: z.number().int().min(1).max(10).nullable().optional(),
      mentalClarity: z.number().int().min(1).max(10).nullable().optional(),
      confidenceInPlan: z.number().int().min(1).max(10).nullable().optional(),
      morningRoutineDone: z.boolean().optional(),
      externalStress: z.string().max(1000).nullable().optional(),
      physicalState: z.string().max(500).nullable().optional(),
    })
    .optional(),
  postSession: z
    .object({
      overallEmotionalState: z.number().int().min(1).max(10).nullable().optional(),
      steppedAwayAfterClose: z.boolean().nullable().optional(),
      windDownUsed: z.boolean().nullable().optional(),
      carryoverThoughts: z.string().max(1000).nullable().optional(),
      reflectionNotes: z.string().max(3000).nullable().optional(),
    })
    .optional(),
  disciplineChecklist: z.record(z.boolean()).optional(),
  tradeEmotions: z
    .array(
      z.object({
        tradeNumber: z.number().int(),
        emotionBeforeEntry: z.string().max(300).optional(),
        emotionDuringTrade: z.string().max(300).optional(),
        emotionAfterClose: z.string().max(300).optional(),
        urgeToBreakRules: z.boolean().optional(),
        whatTriggeredIt: z.string().max(500).optional(),
      })
    )
    .max(10)
    .optional(),
});

export const upsertWeeklyReviewSchema = z.object({
  weekStarting: z.string().min(1).max(40),
  whatWorkedThisWeek: z.string().max(2000).nullable().optional(),
  whatDidntWork: z.string().max(2000).nullable().optional(),
  oneChangeForNextWeek: z.string().max(1000).nullable().optional(),
  onTrackForTarget: z.boolean().nullable().optional(),
});

export const upsertMonthlyStatSchema = z.object({
  month: z.string().min(1).max(20),
  monthlyTakeaway: z.string().max(3000).nullable().optional(),
  onPaceToPassPhase: z.boolean().nullable().optional(),
});

export const setupPreferenceSchema = z.object({
  setupType: z.string().min(1).max(120),
  decision: z.enum(['KEEP', 'DROP', 'UNDECIDED']),
});
