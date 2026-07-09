import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const INDICES = [
  ['SENSEX', '83,412.60', true],
  ['NIFTY 50', '25,318.15', true],
  ['BANK NIFTY', '57,204.30', false],
  ['USD/INR', '85.92', true],
  ['GOLD (MCX)', '₹98,340', false],
  ['CRUDE OIL', '₹5,712', true],
  ['FIN NIFTY', '26,881.40', true],
  ['USDJPY', '148.22', false],
];

export default function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="bg-bg text-white min-h-screen">
      <Ticker />
      <Nav />
      <Hero />
      <ProblemSolution />
      <Features />
      <IndiaMarkets />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Ticker() {
  const row = [...INDICES, ...INDICES];
  return (
    <div className="bg-[#080A0F] border-b border-border overflow-hidden whitespace-nowrap py-[9px]">
      <div className="ticker-track">
        {row.map(([name, val, up], i) => (
          <span key={i} className="inline-flex items-center gap-2 font-mono text-[12.5px] px-6 text-gray-500 border-r border-border">
            <b className="text-white font-semibold tracking-wide">{name}</b> {val}{' '}
            <span className={up ? 'text-green' : 'text-red'}>
              {up ? '▲' : '▼'} {(Math.random() * 1.2).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 bg-bg/95 backdrop-blur border-b border-border z-50">
      <div className="max-w-[1180px] mx-auto px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
          <span className="w-[9px] h-[9px] rounded-full bg-amber" style={{ boxShadow: '0 0 10px #F0A93B' }} />
          Marked
        </div>
        <div className="hidden md:flex gap-8 text-sm text-gray-400">
          <a href="#product" className="hover:text-white">Product</a>
          <a href="#markets" className="hover:text-white">India Markets</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white hidden sm:inline">Log in</Link>
          <Link to="/register" className="bg-amber text-[#1A1305] font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="pt-20 pb-14">
      <div className="max-w-[1180px] mx-auto px-7 grid grid-cols-1 md:grid-cols-2 gap-14 items-start">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs text-amber border border-amber/40 bg-amber/[0.06] px-3 py-1.5 rounded-full mb-6">
            ● Built for FundedNext, FTMO &amp; prop-firm challenges
          </div>
          <h1 className="font-display font-bold leading-[1.08] tracking-tight text-4xl md:text-5xl mb-5">
            Pass the challenge by <span className="text-amber">journaling like it's your job.</span>
          </h1>
          <p className="text-gray-400 text-[17px] max-w-[480px] mb-8">
            Most funded accounts don't get blown by bad setups — they get blown by the third trade of the day, taken on tilt, without a confirmed level. Marked logs every trade, tracks the emotion behind it, and shows you the pattern before it costs you the account.
          </p>
          <div className="flex gap-3.5 flex-wrap mb-6">
            <Link to="/register" className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3.5 rounded-md hover:-translate-y-px transition-transform inline-block">
              Start free trial
            </Link>
            <a href="#product" className="border border-border text-white font-medium text-sm px-5.5 py-3.5 px-5 py-3 rounded-md hover:border-gray-500 transition-colors inline-block">
              See how it works
            </a>
          </div>
          <p className="font-mono text-[13px] text-gray-500">No card required · 2-minute daily log · Built by traders</p>
        </div>

        <div className="bg-panel border border-border rounded-[10px] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-border bg-[#171C27]">
            <span className="font-mono text-xs text-gray-500">DAILY LOG — 03 JUL 2026</span>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2B3244]" />
              <span className="w-2 h-2 rounded-full bg-[#2B3244]" />
              <span className="w-2 h-2 rounded-full bg-[#2B3244]" />
            </div>
          </div>
          <div className="p-[18px]">
            <div className="font-mono text-[11px] text-[#C99A3F] bg-amber/[0.08] border border-amber/30 rounded-md px-2.5 py-2 mb-4 leading-relaxed">
              MAX 2 TRADES/DAY · RISK 1.5–2% · LONDON SESSION ONLY · COT SIGNAL REQUIRED AT KEY VP LEVEL
            </div>
            <div className="grid grid-cols-4 gap-2.5 font-mono text-[10.5px] uppercase tracking-wide text-gray-500 pb-2.5 border-b border-border">
              <div>Setup</div><div>R:R</div><div>Result</div><div>Rule</div>
            </div>
            <div className="grid grid-cols-4 gap-2.5 font-mono text-xs py-2.5 border-b border-border items-center">
              <div>VP POC rejection <span className="ml-1 text-[11px] text-green bg-green/10 px-2 py-0.5 rounded">LONG</span></div>
              <div>1:2.4</div><div className="text-green">+2.1R</div><div className="text-green">✓</div>
            </div>
            <div className="grid grid-cols-4 gap-2.5 font-mono text-xs py-2.5 items-center">
              <div>VAH sweep <span className="ml-1 text-[11px] text-green bg-green/10 px-2 py-0.5 rounded">LONG</span></div>
              <div>1:1.8</div><div className="text-green">+1.8R</div><div className="text-green">✓</div>
            </div>
            <div className="flex items-center gap-3.5 mt-4 pt-4 border-t border-border">
              <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(#F0A93B 0% 78%, #232A38 78% 100%)' }}>
                <div className="w-10 h-10 rounded-full bg-panel flex items-center justify-center font-mono text-xs font-semibold">7.8</div>
              </div>
              <div className="text-[12.5px] text-gray-500">
                Discipline score<br /><b className="text-white text-[13.5px] font-mono font-normal">Followed plan on 2/2 trades</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProblemSolution() {
  return (
    <section id="product" className="border-t border-border py-20">
      <div className="max-w-[1180px] mx-auto px-7">
        <div className="font-mono text-xs text-amber uppercase tracking-wide mb-2.5">The problem</div>
        <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-3.5 max-w-xl">
          Spreadsheets don't tell you why you broke the rule.
        </h2>
        <p className="text-gray-400 text-[15.5px] max-w-xl mb-11">
          You already know your win rate. What breaks a challenge is the trade you weren't supposed to take — the revenge entry, the moved stop, the third trade after two wins. A journal that only tracks P&amp;L misses the actual failure point.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-panel border border-border rounded-[10px] p-6">
            <h3 className="font-display text-base text-red mb-4">A spreadsheet</h3>
            <ul className="space-y-0">
              {[
                'Tracks entries and exits, nothing about state of mind',
                'No link between rule-breaks and outcomes',
                'Reviewed rarely, if ever',
                'No record of DOM/COT confirmation before entry',
              ].map((t) => <li key={t} className="text-sm text-gray-400 py-2 border-b border-border last:border-0">{t}</li>)}
            </ul>
          </div>
          <div className="bg-panel border border-border rounded-[10px] p-6">
            <h3 className="font-display text-base text-green mb-4">Marked</h3>
            <ul className="space-y-0">
              {[
                'Every trade tagged against your own daily discipline rule',
                'Emotion logged before, during, and after each trade',
                'Weekly and monthly rollups built automatically from daily logs',
                'One discipline score that tells you if you\'re on pace to pass',
              ].map((t) => <li key={t} className="text-sm text-gray-400 py-2 border-b border-border last:border-0">{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  ['01', 'Daily Trade Log', 'Entry, stop, target, R:R, COT signal, DOM confirmation, and a setup description for every trade — capped at your own daily limit.'],
  ['02', 'Emotion & Discipline Tracker', 'Pre-session state, per-trade emotion, and a 10-point discipline checklist so rule-breaks get caught the same day, not the same month.'],
  ['03', 'Weekly & Monthly Review', 'Net R, win rate, and discipline score rolled up automatically. See which setups earn their place and which ones get dropped.'],
  ['04', 'Challenge Progress', 'Profit target %, distance to max drawdown, and minimum trading days — the exact numbers your prop firm is watching.'],
  ['05', 'PDF Reports', 'Export any daily log, weekly review, or monthly scoreboard as a clean PDF — for your own records or to show a mentor.'],
  ['06', 'India Markets Desk', 'Sensex, Nifty, Bank Nifty and USD/INR context alongside your journal, plus curated news for Indian traders. Details below.'],
];

function Features() {
  return (
    <section className="border-t border-border py-20">
      <div className="max-w-[1180px] mx-auto px-7">
        <div className="font-mono text-xs text-amber uppercase tracking-wide mb-2.5">What's inside</div>
        <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-3.5 max-w-xl">
          Everything you're already tracking by hand, structured properly.
        </h2>
        <p className="text-gray-400 text-[15.5px] max-w-xl mb-11">
          Four connected modules. Fill in the daily log once — the weekly review and monthly scoreboard build themselves.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(([num, title, desc]) => (
            <div key={num} className="bg-panel border border-border rounded-[10px] p-6 hover:border-gray-600 transition-colors">
              <div className="font-mono text-[11px] text-gray-500 mb-3.5">{num}</div>
              <h4 className="font-display text-[16.5px] mb-2">{title}</h4>
              <p className="text-[13.5px] text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IndiaMarkets() {
  return (
    <section id="markets" className="border-t border-border py-20">
      <div className="max-w-[1180px] mx-auto px-7">
        <div className="font-mono text-xs text-amber uppercase tracking-wide mb-2.5">Built for Indian traders</div>
        <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-3.5 max-w-xl">
          Market context, without pretending to be your advisor.
        </h2>
        <p className="text-gray-400 text-[15.5px] max-w-xl mb-11">
          A running view of the indices you're trading against, plus a curated news feed — economic calendar, RBI policy, FII/DII flows. Commentary and context only. No buy/sell calls, no signals — that's a line we won't cross.
        </p>

        <div className="rounded-xl border border-border p-9 grid grid-cols-1 md:grid-cols-2 gap-9 items-center" style={{ background: 'linear-gradient(135deg,#12161F 0%,#171C27 100%)' }}>
          <div>
            {[['SENSEX', '83,412.60', true], ['NIFTY 50', '25,318.15', true], ['BANK NIFTY', '57,204.30', false], ['USD/INR', '85.92', true]].map(([n, v, up]) => (
              <div key={n} className="bg-bg border border-border rounded-lg px-4 py-3.5 flex justify-between items-center mb-2.5">
                <div>
                  <div className="text-[13px] text-gray-500">{n}</div>
                  <div className="font-mono text-base font-semibold">{v}</div>
                </div>
                <div className={`font-mono text-[12.5px] ${up ? 'text-green' : 'text-red'}`}>{up ? '▲' : '▼'} 0.42%</div>
              </div>
            ))}
            <div className="inline-block font-mono text-[11px] text-gray-500 border border-border px-2.5 py-1 rounded-full mt-2">
              Delayed data · educational context, not investment advice
            </div>
          </div>
          <div>
            <h3 className="font-display text-lg mb-3.5">What this desk actually gives you</h3>
            <ul>
              {[
                "Daily index snapshot so you're not tab-switching mid-session",
                'Red-folder economic events auto-populated into your pre-session notes',
                'Curated news written for Indian intraday and swing traders — no clickbait, no calls',
                'RBI policy and FII/DII flow summaries, twice weekly',
              ].map((t) => <li key={t} className="text-sm text-gray-400 py-2.5 border-b border-border last:border-0">{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: 'Starter', desc: 'For traders testing the habit', price: '₹0', period: '/ 14 days', feats: ['Full daily log & emotion tracker', 'Weekly review', '1 challenge account'], cta: 'Start free', featured: false },
    { name: 'Pro', desc: 'Most funded traders land here', price: '₹499', period: '/ month', feats: ['Everything in Starter', 'Monthly stats & setup breakdown', 'PDF reports', 'India Markets Desk', 'Up to 3 challenge accounts'], cta: 'Start free trial', featured: true },
    { name: 'Firm', desc: 'Prop firms & trading mentors', price: '₹1,999', period: '/ month', feats: ['Everything in Pro', 'Unlimited challenge accounts', 'Team view for mentors/coaches', 'Priority support'], cta: 'Talk to us', featured: false },
  ];
  return (
    <section id="pricing" className="border-t border-border py-20">
      <div className="max-w-[1180px] mx-auto px-7">
        <div className="font-mono text-xs text-amber uppercase tracking-wide mb-2.5">Pricing</div>
        <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-3.5 max-w-xl">Cheaper than one bad trade.</h2>
        <p className="text-gray-400 text-[15.5px] max-w-xl mb-11">Cancel anytime. Prices in INR, billed monthly.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-xl p-7 flex flex-col border ${p.featured ? 'border-amber/40' : 'border-border'} bg-panel`}
              style={p.featured ? { background: 'linear-gradient(180deg, rgba(240,169,59,0.05), transparent 40%), #12161F' } : undefined}
            >
              <div className="font-display text-[17px] mb-1.5">{p.name}</div>
              <div className="text-[13px] text-gray-400 mb-3.5">{p.desc}</div>
              <div className="font-mono text-[32px] font-semibold mb-1">{p.price} <span className="text-[13px] text-gray-500 font-normal">{p.period}</span></div>
              <ul className="flex-1 my-5">
                {p.feats.map((f) => (
                  <li key={f} className="text-[13.5px] py-1.5 flex gap-2"><span className="text-amber">—</span>{f}</li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`text-center py-2.5 rounded-md text-sm font-semibold border ${p.featured ? 'bg-amber text-[#1A1305] border-transparent' : 'border-border text-white'}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border py-24 text-center">
      <div className="max-w-[1180px] mx-auto px-7">
        <h2 className="font-display font-bold text-3xl md:text-[42px] tracking-tight mb-4">
          Your next challenge attempt starts<br />with today's log.
        </h2>
        <p className="text-gray-400 mb-7">No card required. Two minutes a day.</p>
        <Link to="/register" className="bg-amber text-[#1A1305] font-semibold text-sm px-6 py-3.5 rounded-md hover:opacity-90 transition-opacity inline-block">
          Start free trial
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-[1180px] mx-auto px-7 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2 font-display font-bold text-[15px]">
          <span className="w-2.5 h-2.5 rounded-full bg-amber" style={{ boxShadow: '0 0 10px #F0A93B' }} />
          Marked
        </div>
        <div className="text-[12.5px] text-gray-500">
          Market data shown is illustrative and delayed. Marked does not provide investment advice. © 2026 Marked.
        </div>
      </div>
    </footer>
  );
}
