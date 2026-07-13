import PDFDocument from 'pdfkit';

const AMBER = '#B8790E'; // darker than the UI amber — reads better on white paper
const MUTED = '#666666';
const DARK = '#1A1A1A';
const RULE_BG = '#FDF3E0';

export function startPdf(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function header(doc, title, subtitle) {
  doc.fillColor(AMBER).fontSize(9).font('Helvetica-Bold').text('MARKED', 40, 40);
  doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold').text(title, 40, 56);
  if (subtitle) doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(subtitle, 40, 78);
  doc.moveDown(1.5);
  doc.strokeColor('#DDDDDD').moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);
}

function ruleBanner(doc, text) {
  const y = doc.y;
  doc.rect(40, y, 515, 26).fill(RULE_BG);
  doc.fillColor(AMBER).fontSize(8).font('Helvetica-Bold').text(text, 48, y + 9, { width: 500 });
  doc.moveDown(2.2);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.5);
  doc.fillColor(AMBER).fontSize(11).font('Helvetica-Bold').text(text.toUpperCase());
  doc.moveDown(0.3);
}

function kvRow(doc, label, value) {
  const y = doc.y;
  doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(label.toUpperCase(), 40, y, { width: 240 });
  doc.fillColor(DARK).fontSize(10).font('Helvetica').text(value ?? '—', 40, y + 11, { width: 240 });
  doc.moveDown(1.6);
}

function twoCol(doc, pairs) {
  const startY = doc.y;
  let leftY = startY, rightY = startY;
  pairs.forEach(([label, value], i) => {
    const col = i % 2;
    const x = col === 0 ? 40 : 300;
    const y = col === 0 ? leftY : rightY;
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(label.toUpperCase(), x, y, { width: 240 });
    doc.fillColor(DARK).fontSize(10).font('Helvetica').text(String(value ?? '—'), x, y + 11, { width: 240 });
    if (col === 0) leftY += 32; else rightY += 32;
  });
  doc.y = Math.max(leftY, rightY);
}

function table(doc, headers, rows, widths) {
  const startX = 40;
  let y = doc.y;
  doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold');
  let x = startX;
  headers.forEach((h, i) => { doc.text(h.toUpperCase(), x, y, { width: widths[i] }); x += widths[i]; });
  y += 14;
  doc.strokeColor('#DDDDDD').moveTo(startX, y).lineTo(startX + widths.reduce((a, b) => a + b, 0), y).stroke();
  y += 6;
  doc.font('Helvetica').fontSize(9);
  rows.forEach((row) => {
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(DARK).text(String(cell ?? '—'), x, y, { width: widths[i] });
      x += widths[i];
    });
    y += 16;
  });
  doc.y = y + 8;
}

const num = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d));

// ---------- Daily Trade Log ----------
// export function renderDailyLogPdf(doc, { account, log, date }) {
//   header(doc, 'Daily Trade Log', `${account.name} · ${new Date(date).toDateString()}`);
//   ruleBanner(doc, 'MAX 2 TRADES/DAY · RISK 1.5–2% PER TRADE · LONDON SESSION ONLY · CONFIRMED COT SIGNAL REQUIRED AT KEY VP LEVEL');

//   if (!log) {
//     doc.fillColor(MUTED).fontSize(10).text('No log recorded for this date.');
//     return;
//   }

//   twoCol(doc, [
//     ['Account balance', `$${num(log.accountBalance, 2)}`],
//     ['Day # in challenge', log.dayNumberInChallenge],
//     ['News / red folder events', log.newsEvents],
//     ['Pre-session bias (HTF)', log.preSessionBiasHtf],
//   ]);

//   sectionTitle(doc, 'Trades');
//   if (log.trades.length) {
//     table(
//       doc,
//       ['#', 'Dir', 'Entry', 'SL', 'TP', 'R:R', 'Method', 'Result (R)', 'Plan?'],
//       log.trades.map((t) => [t.tradeNumber, t.direction, t.entry, t.stopLoss, t.takeProfit, t.riskReward, t.method, t.resultR, t.followedPlan]),
//       [25, 40, 55, 55, 55, 45, 90, 65, 50]
//     );
//   } else {
//     doc.fillColor(MUTED).fontSize(9).text('No trades logged.');
//     doc.moveDown(1);
//   }

//   sectionTitle(doc, 'End of Day Summary');
//   twoCol(doc, [
//     ['Total trades taken', log.trades.length],
//     ['Net R for the day', num(log.trades.reduce((s, t) => s + (t.resultR ?? 0), 0))],
//     ['Daily loss limit hit?', log.dailyLossLimitHit ? 'Yes' : 'No'],
//     ['Stayed within max trades?', log.stayedWithinMaxTrades ? 'Yes' : 'No'],
//   ]);
//   kvRow(doc, 'What worked today', log.whatWorkedToday);
//   kvRow(doc, 'What to fix tomorrow', log.whatToFixTomorrow);
//   kvRow(doc, "One-line lesson for tomorrow", log.oneLineLesson);
// }

// Server-side image fetch for embedding chart snapshots — returns null on
// any failure (network error, 404, etc.) rather than throwing, so one bad
// image never takes down the whole PDF generation.
async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// One block per trade instead of a cramped table — there are too many
// fields per trade now (time, lot size, COT signal, P/L, notes, image) to
// fit as table columns on an A4 page.
async function renderTradeBlock(doc, t) {
  if (doc.y > 620) doc.addPage();

  doc.fillColor(AMBER).fontSize(11).font('Helvetica-Bold').text(`TRADE ${t.tradeNumber}`);
  doc.moveDown(0.3);

  twoCol(doc, [
    ['Time', t.time],
    ['Direction', t.direction],
    ['Entry', t.entry],
    ['Stop loss', t.stopLoss],
    ['Take profit', t.takeProfit],
    ['Lot size', t.lotSize],
    ['R:R', t.riskReward],
    ['Method', t.method],
    ['COT signal', t.cotSignal],
    ['Result (R)', t.resultR],
    ['P/L (₹/$)', t.pnl != null ? num(t.pnl, 2) : null],
    ['Followed plan?', t.followedPlan],
  ]);

  kvRow(doc, 'Setup / liquidity sweep description', t.setupDescription);
  kvRow(doc, 'DOM confirmation', t.domConfirmation);

  if (t.chartSnapshotUrl) {
    const buffer = await fetchImageBuffer(t.chartSnapshotUrl);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold').text('CHART SNAPSHOT');
    doc.moveDown(0.3);
    if (buffer) {
      if (doc.y > 500) doc.addPage();
      try {
        doc.image(buffer, { fit: [280, 180] });
        doc.y += 190; // pdfkit doesn't auto-advance the cursor after doc.image()
      } catch {
        // Most likely a WEBP — pdfkit only supports embedding JPEG/PNG
        doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('(Image format not supported in PDF export — try PNG or JPEG)');
        doc.moveDown(1);
      }
    } else {
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('(Chart snapshot unavailable)');
      doc.moveDown(1);
    }
  }

  doc.moveDown(0.5);
  doc.strokeColor('#DDDDDD').moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);
}

export async function renderDailyLogPdf(doc, { account, log, date }) {
  header(doc, 'Daily Trade Log', `${account.name} · ${new Date(date).toDateString()}`);
  ruleBanner(doc, 'MAX 2 TRADES/DAY · RISK 1.5–2% PER TRADE · LONDON SESSION ONLY · CONFIRMED COT SIGNAL REQUIRED AT KEY VP LEVEL');

  if (!log) {
    doc.fillColor(MUTED).fontSize(10).text('No log recorded for this date.');
    return;
  }

  sectionTitle(doc, 'Pre-Session Info');
  twoCol(doc, [
    ['Account balance', `$${num(log.accountBalance, 2)}`],
    ['Day # in challenge', log.dayNumberInChallenge],
    ['News / red folder events', log.newsEvents],
    ['Pre-session bias (HTF)', log.preSessionBiasHtf],
    ['Key VP levels marked', log.keyVpLevels],
  ]);

  sectionTitle(doc, 'Trades');
  if (log.trades.length) {
    for (const t of log.trades) {
      await renderTradeBlock(doc, t);
    }
  } else {
    doc.fillColor(MUTED).fontSize(9).text('No trades logged.');
    doc.moveDown(1);
  }

  if (doc.y > 620) doc.addPage();
  sectionTitle(doc, 'End of Day Summary');
  twoCol(doc, [
    ['Total trades taken', log.trades.length],
    ['Net R for the day', num(log.trades.reduce((s, t) => s + (t.resultR ?? 0), 0))],
    ['Daily loss limit hit?', log.dailyLossLimitHit ? 'Yes' : 'No'],
    ['Stayed within max trades?', log.stayedWithinMaxTrades ? 'Yes' : 'No'],
  ]);
  kvRow(doc, 'What worked today', log.whatWorkedToday);
  kvRow(doc, 'What to fix tomorrow', log.whatToFixTomorrow);
  kvRow(doc, "One-line lesson for tomorrow", log.oneLineLesson);
}

// ---------- Weekly Review ----------
export function renderWeeklyPdf(doc, data) {
  header(doc, 'Weekly Review', `${data.account.name} · Week of ${data.weekStarting.toDateString()}`);

  sectionTitle(doc, 'Week at a Glance');
  table(
    doc,
    ['Date', 'Trades', 'Wins', 'Losses', 'Net R', 'Net P/L', 'Rules?'],
    data.days.map((d) => [new Date(d.date).toDateString().slice(0, 10), d.trades, d.wins, d.losses, num(d.netR), num(d.netPnl, 2), d.rulesFollowed ? 'Y' : 'N']),
    [90, 55, 45, 55, 55, 70, 55]
  );

  sectionTitle(doc, 'Weekly Stats');
  twoCol(doc, [
    ['Win rate', data.winRate != null ? `${num(data.winRate)}%` : '—'],
    ['Total trades', data.totals.trades],
    ['Net R', num(data.totals.netR)],
    ['Net P/L', `$${num(data.totals.netPnl, 2)}`],
    ['Starting balance', `$${num(data.startBalance, 2)}`],
    ['Ending balance', `$${num(data.endBalance, 2)}`],
  ]);

  sectionTitle(doc, 'Challenge Progress');
  twoCol(doc, [
    ['On track for target?', data.onTrackForTarget == null ? '—' : data.onTrackForTarget ? 'Yes' : 'No'],
    ['Profit target', data.account.profitTargetPercent ? `${data.account.profitTargetPercent}%` : '—'],
  ]);

  if (data.reflection) {
    sectionTitle(doc, 'Reflection');
    kvRow(doc, 'What worked this week', data.reflection.whatWorkedThisWeek);
    kvRow(doc, "What didn't work / recurring mistakes", data.reflection.whatDidntWork);
    kvRow(doc, 'One change for next week', data.reflection.oneChangeForNextWeek);
  }
}

// ---------- Monthly Stats ----------
export function renderMonthlyPdf(doc, data) {
  header(doc, 'Monthly Stats Summary', `${data.account.name} · ${data.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);

  sectionTitle(doc, 'Core Numbers');
  twoCol(doc, [
    ['Total trades', data.core.totalTrades],
    ['Win rate', data.core.winRate != null ? `${num(data.core.winRate)}%` : '—'],
    ['Avg R:R', data.core.avgRR != null ? `1:${num(data.core.avgRR)}` : '—'],
    ['Net R', num(data.core.netR)],
    ['Profit factor', data.core.profitFactor != null ? num(data.core.profitFactor, 2) : '—'],
    ['Max drawdown', `${num(data.core.maxDrawdown)}%`],
  ]);

  sectionTitle(doc, 'Balance Tracking');
  table(
    doc,
    ['Week', 'Start Bal', 'End Bal', 'Net R', 'Net P/L', 'Rule Breaks'],
    data.weeks.map((w) => [w.label, `$${num(w.startBalance, 0)}`, `$${num(w.endBalance, 0)}`, num(w.netR), `$${num(w.netPnl, 2)}`, w.ruleBreaks]),
    [70, 75, 75, 60, 80, 80]
  );

  sectionTitle(doc, 'Setup Performance Breakdown');
  table(
    doc,
    ['Setup', 'Taken', 'Win %', 'Avg R:R', 'Net R', 'Keep/Drop'],
    data.setupBreakdown.map((s) => [s.setupType, s.timesTaken, s.winRate != null ? `${num(s.winRate)}%` : '—', s.avgRR != null ? num(s.avgRR) : '—', num(s.netR), s.decision]),
    [140, 50, 55, 60, 55, 80]
  );

  sectionTitle(doc, 'Discipline Scorecard');
  twoCol(doc, [
    ['Days exceeded 2-trade max', data.discipline.daysExceededMaxTrades],
    ['Days exceeded loss limit', data.discipline.daysExceededLossLimit],
    ['Trades without COT confirmation', data.discipline.tradesWithoutCot],
    ['Avg discipline score', data.discipline.avgDisciplineScore != null ? num(data.discipline.avgDisciplineScore) : '—'],
  ]);

  sectionTitle(doc, 'Challenge Status');
  twoCol(doc, [
    ['Profit target progress', data.challengeStatus.profitTargetProgress != null ? `${num(data.challengeStatus.profitTargetProgress)}%` : '—'],
    ['Distance to drawdown limit', data.challengeStatus.distanceToDrawdownLimit != null ? `${num(data.challengeStatus.distanceToDrawdownLimit)}%` : '—'],
    ['Min trading days completed', `${data.challengeStatus.tradingDaysCompleted} / ${data.challengeStatus.minTradingDays ?? '—'}`],
    ['On pace to pass?', data.challengeStatus.onPaceToPassPhase == null ? '—' : data.challengeStatus.onPaceToPassPhase ? 'Yes' : 'No'],
  ]);

  if (data.monthlyTakeaway) {
    sectionTitle(doc, 'Monthly Takeaway');
    kvRow(doc, 'Key learning this month', data.monthlyTakeaway);
  }
}
