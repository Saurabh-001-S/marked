import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { AuthShell, AuthField } from './Login';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong resetting your password');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Reset your password" footer={<Link to="/forgot-password" className="text-amber hover:underline">Request a new link</Link>}>
        <p className="text-sm text-red">This reset link is missing its token — check the link in your email.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" footer={<Link to="/login" className="text-amber hover:underline">Back to login</Link>}>
      {success ? (
        <p className="text-sm text-green">Password updated. Redirecting you to login...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField label="New password" type="password" value={password} onChange={setPassword} />
          {error && <p className="text-xs font-mono text-red">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full bg-amber text-[#1A1305] font-semibold text-sm py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
