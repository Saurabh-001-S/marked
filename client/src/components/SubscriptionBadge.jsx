import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, createSubscription, retryPayment, loadRazorpayScript } from '../api/billing';

const LABELS = {
  TRIAL: 'Trial',
  ACTIVE: 'Pro · Active',
  PAST_DUE: 'Payment failed',
  CANCELED: 'Canceled',
};
const COLORS = {
  TRIAL: 'text-amber border-amber/30 bg-amber/5',
  ACTIVE: 'text-green border-green/30 bg-green/5',
  PAST_DUE: 'text-red border-red/30 bg-red/5',
  CANCELED: 'text-gray-500 border-border',
};

export default function SubscriptionBadge() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: sub } = useQuery({ queryKey: ['subscription'], queryFn: getSubscription });

  function openCheckout({ subscriptionId, keyId, prefill }, description) {
    const checkout = new window.Razorpay({
      key: keyId,
      subscription_id: subscriptionId,
      name: 'Marked',
      description,
      prefill,
      theme: { color: '#F0A93B' },
      handler: () => {
        // Real activation happens via the signed server-side webhook, not this
        // callback — this just refreshes the badge so it picks up the new
        // status within a few seconds instead of on next page load.
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      },
      modal: { ondismiss: () => setProcessing(false) },
    });
    checkout.on('payment.failed', () => {
      alert('Payment failed. No charge was made — you can try again anytime.');
    });
    checkout.open();
  }

  async function handleUpgrade() {
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) return alert('Could not load the payment gateway. Check your connection and try again.');
      const data = await createSubscription();
      openCheckout(data, 'Pro plan — ₹499/month');
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong starting checkout.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRetry() {
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) return alert('Could not load the payment gateway. Check your connection and try again.');
      const data = await retryPayment();
      openCheckout(data, 'Retry payment — Pro plan');
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong retrying payment.');
    } finally {
      setProcessing(false);
    }
  }

  if (!sub) return null;

  const daysLeft = sub.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const graceDaysLeft = sub.gracePeriodEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.gracePeriodEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  let label = LABELS[sub.status];
  if (sub.status === 'TRIAL' && daysLeft != null) label = `Trial · ${daysLeft}d left`;
  if (sub.status === 'PAST_DUE' && graceDaysLeft != null) label = `Payment failed · ${graceDaysLeft}d to fix`;

  return (
    <div className="flex items-center gap-3">
      <span className={`font-mono text-[11px] px-2.5 py-1 rounded-full border ${COLORS[sub.status]}`}>{label}</span>
      {sub.status === 'PAST_DUE' && (
        <button onClick={handleRetry} disabled={processing} className="bg-red text-white font-semibold text-xs px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50">
          {processing ? 'Loading...' : 'Retry payment'}
        </button>
      )}
      {(sub.status === 'TRIAL' || sub.status === 'CANCELED') && (
        <button onClick={handleUpgrade} disabled={processing} className="bg-amber text-[#1A1305] font-semibold text-xs px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50">
          {processing ? 'Loading...' : 'Upgrade to Pro'}
        </button>
      )}
    </div>
  );
}
