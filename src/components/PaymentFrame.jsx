import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function PaymentFrame({ paymentUrl, cartId, onPaymentConfirmed }) {
  const [status, setStatus] = useState('loading'); // loading | ready | paid
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!cartId || !paymentUrl) return;

    // Observar mudanças nos pedidos do carrinho via real-time
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.data?.cart_id === cartId && event.data?.status === 'paid') {
        setStatus('paid');
        setTimeout(() => {
          onPaymentConfirmed?.();
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [cartId, paymentUrl]);

  if (status === 'paid') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
          <CheckCircle2 size={36} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-foreground">Pagamento Confirmado!</h3>
          <p className="text-sm text-muted-foreground mt-2">Seu pagamento foi processado com sucesso. Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Loading overlay */}
      {!iframeLoaded && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando pagamento...</p>
        </div>
      )}

      {/* Iframe do checkout */}
      <iframe
        src={paymentUrl}
        className={`flex-1 w-full border-0 ${iframeLoaded ? 'block' : 'hidden'}`}
        style={{ minHeight: '520px' }}
        onLoad={() => setIframeLoaded(true)}
        title="Checkout InfinitePay"
        allow="payment"
      />
    </div>
  );
}