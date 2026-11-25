'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';

export default function CheckoutButton({
  bundle_id,
  label,
  className,
}: {
  bundle_id?: string;
  label: string;
  className: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!bundle_id) {
      router.push('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ bundle_id, type: 'credit_topup' }),
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || 'Could not start checkout. Please sign in first.');
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('auth')) {
        toast.info('Sign in to your student account to top up credits.');
        router.push('/login?next=/pricing');
      } else {
        toast.error('Sign in to purchase permanent study credits.');
        router.push('/login?next=/pricing');
      }
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className={`${className} inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.98]`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to Paystack...</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
