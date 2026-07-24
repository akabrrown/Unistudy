'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';

export default function CheckoutButton({ 
  amount,
  credits, 
  label, 
  className 
}: { 
  amount?: number;
  credits?: number; 
  label: string; 
  className: string; 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!amount || !credits) {
      router.push('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ amount, credits, type: 'credit_topup' })
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCheckout}
      disabled={loading}
      className={`${className} disabled:opacity-50`}
    >
      {loading ? 'Loading...' : label}
    </button>
  );
}
