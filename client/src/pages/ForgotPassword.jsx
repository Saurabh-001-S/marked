import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { AuthShell, AuthField } from './Login';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      // Always show the same confirmation regardless of outcome — the
      // backend intentionally doesn't reveal whether the email exists,
      // and neither should this screen.
      setSubmitted(true);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Reset your password" footer={<Link to="/login" className="text-amber hover:underline">Back to login</Link>}>
      {submitted ? (
        <p className="text-sm text-gray-300">If that email has an account, a reset link is on its way. Check your inbox.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField label="Email" type="email" value={email} onChange={setEmail} />
          <button type="submit" disabled={submitting} className="w-full bg-amber text-[#1A1305] font-semibold text-sm py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity">
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
