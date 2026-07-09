import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { AuthShell } from './Login';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    if (!token) return setStatus('error');
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthShell title="Email verification" footer={<Link to="/dashboard" className="text-amber hover:underline">Go to dashboard</Link>}>
      {status === 'verifying' && <p className="text-sm text-gray-400 font-mono">Verifying...</p>}
      {status === 'success' && <p className="text-sm text-green">Your email is verified. Thanks!</p>}
      {status === 'error' && <p className="text-sm text-red">This verification link is invalid or has expired.</p>}
    </AuthShell>
  );
}
