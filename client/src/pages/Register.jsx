import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthShell, AuthField } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password needs to be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong creating your account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Start your free trial" footer={<>Already have an account? <Link to="/login" className="text-amber hover:underline">Log in</Link></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <AuthField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <AuthField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        {error && <p className="text-xs font-mono text-red">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full bg-amber text-[#1A1305] font-semibold text-sm py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-[11px] font-mono text-gray-500 text-center">14-day free trial. No card required.</p>
      </form>
    </AuthShell>
  );
}
