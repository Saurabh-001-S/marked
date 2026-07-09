import api from './client';

export const getSubscription = () => api.get('/billing/subscription').then((r) => r.data);
export const createSubscription = () => api.post('/billing/subscribe').then((r) => r.data);
export const retryPayment = () => api.post('/billing/retry').then((r) => r.data);
export const cancelSubscription = () => api.post('/billing/cancel').then((r) => r.data);

// Razorpay Checkout is a script tag, not an npm package — load it once and
// reuse if it's already on the page (e.g. user opens checkout twice).
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
