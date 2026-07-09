import { useState } from 'react';
import api from '../api/client';

export default function EmailVerificationBanner({ user }) {
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  async function handleResend() {
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
    } catch {
      // Silent fail is fine here — worst case the user clicks again
    }
  }

  return (
    <div className="bg-amber/5 border border-amber/20 rounded-md px-4 py-3 mb-6 flex items-center justify-between flex-wrap gap-3">
      <p className="text-xs font-mono text-amber/90">
        {sent ? 'Verification email sent — check your inbox.' : `Verify ${user.email} to make sure you get billing and account notices.`}
      </p>
      <div className="flex gap-3">
        {!sent && <button onClick={handleResend} className="text-xs font-mono text-amber hover:underline">Resend email</button>}
        <button onClick={() => setDismissed(true)} className="text-xs font-mono text-gray-500 hover:text-white">dismiss</button>
      </div>
    </div>
  );
}
