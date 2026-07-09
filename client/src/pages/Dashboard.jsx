import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SubscriptionBadge from '../components/SubscriptionBadge';
import EmailVerificationBanner from '../components/EmailVerificationBanner';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', startingBalance: '', profitTargetPercent: '', maxDrawdownPercent: '', minTradingDays: '' });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/accounts', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setForm({ name: '', startingBalance: '' });
      setShowForm(false);
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber" style={{ boxShadow: '0 0 10px #F0A93B' }} />
            <span className="font-display font-bold">Marked</span>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionBadge />
            <span className="font-mono text-xs text-gray-500">{user?.email}</span>
            <button onClick={logout} className="font-mono text-xs text-gray-500 hover:text-red">log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <EmailVerificationBanner user={user} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold">Your challenge accounts</h1>
          <button onClick={() => setShowForm((s) => !s)} className="bg-amber text-[#1A1305] font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90">
            + New account
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            className="bg-panel border border-border rounded-lg p-5 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Account name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="FundedNext Stellar 2-Step" required className="input" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Starting balance ($)</span>
                <input type="number" value={form.startingBalance} onChange={(e) => setForm({ ...form, startingBalance: e.target.value })} placeholder="6000" required className="input" />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Profit target (%)</span>
                <input type="number" value={form.profitTargetPercent} onChange={(e) => setForm({ ...form, profitTargetPercent: e.target.value })} placeholder="8" className="input" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Max drawdown (%)</span>
                <input type="number" value={form.maxDrawdownPercent} onChange={(e) => setForm({ ...form, maxDrawdownPercent: e.target.value })} placeholder="6" className="input" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">Min trading days</span>
                <input type="number" value={form.minTradingDays} onChange={(e) => setForm({ ...form, minTradingDays: e.target.value })} placeholder="5" className="input" />
              </label>
            </div>
            <button type="submit" disabled={createMutation.isPending} className="bg-amber text-[#1A1305] font-semibold text-sm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create account'}
            </button>
          </form>
        )}

        {isLoading ? (
          <p className="font-mono text-sm text-gray-500">Loading...</p>
        ) : accounts?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => navigate(`/journal/${acc.id}/${today}`)}
                className="text-left bg-panel border border-border rounded-lg p-5 hover:border-amber/40 transition-colors"
              >
                <h3 className="font-display font-semibold mb-1">{acc.name}</h3>
                <p className="font-mono text-xs text-gray-500">Starting balance ${acc.startingBalance.toLocaleString()}</p>
                <p className="font-mono text-xs text-amber mt-3">Open today's log &rarr;</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-panel border border-dashed border-border rounded-lg p-10 text-center">
            <p className="font-mono text-sm text-gray-500 mb-4">No challenge accounts yet. Add one to start journaling today.</p>
            <button onClick={() => setShowForm(true)} className="bg-amber text-[#1A1305] font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90">
              + New account
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
