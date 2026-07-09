import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong logging in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Log in" footer={<>New here? <Link to="/register" className="text-amber hover:underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <AuthField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <div className="text-right -mt-2">
          <Link to="/forgot-password" className="text-xs font-mono text-gray-500 hover:text-amber">Forgot password?</Link>
        </div>
        {error && <p className="text-xs font-mono text-red">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full bg-amber text-[#1A1305] font-semibold text-sm py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, children, footer }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-amber" style={{ boxShadow: '0 0 10px #F0A93B' }} />
          <span className="font-display font-bold text-lg">Marked</span>
        </div>
        <div className="bg-panel border border-border rounded-xl p-7">
          <h1 className="font-display text-xl font-semibold mb-6">{title}</h1>
          {children}
        </div>
        <p className="text-center text-xs font-mono text-gray-500 mt-5">{footer}</p>
      </div>
    </div>
  );
}

export function AuthField({ label, type = 'text', value, onChange }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required className="input" />
    </label>
  );
}
