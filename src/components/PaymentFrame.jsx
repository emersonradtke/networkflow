import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function PaymentFrame({ paymentUrl, cartId, onPaymentConfirmed }) {
  const [status, setStatus] = useState('pending'); // pending | paid | error
  const [unsubscribe, setUnsubscribe] = useState(null);

  useEffect(() => {
    if (!cartId) return;

    // Observar mudanças nos pedidos do carrinho
    const sub = base44.entities.Order.subscribe((event) => {
      if (event.data?.cart_id === cartId && event.data?.status === 'paid') {
        setStatus('paid');
        onPaymentConfirmed?.();
      }
    });

    setUnsubscribe(() => sub);

    return () => {
      sub?.();
    };
  }, [cartId, onPaymentConfirmed]);

  if (status === 'paid') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
          <CheckCircle2 size={36} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-foreground">Pagamento Confirmado!</h3>
          <p className="text-sm text-muted-foreground mt-2">Seu pagamento foi processado com sucesso. Seu pedido está sendo preparado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {status === 'pending' && (
        <>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          {paymentUrl && (
            <iframe
              src={paymentUrl}
              className="absolute inset-0 w-full h-full border-none"
              title="InfinitePay Checkout"
              allow="payment"
            />
          )}
        </>
      )}
    </div>
  );
}