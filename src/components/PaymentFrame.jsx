import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentFrame({ paymentUrl, cartId, onPaymentConfirmed }) {
  const [status, setStatus] = useState('pending'); // pending | paid
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!cartId || !paymentUrl) return;

    // Polling a cada 4 segundos para verificar se o pagamento foi confirmado
    const pollInterval = setInterval(async () => {
      try {
        const orders = await base44.entities.Order.filter({ cart_id: cartId });
        const allPaid = orders.length > 0 && orders.every(o => o.status === 'paid');
        if (allPaid) {
          setStatus('paid');
          clearInterval(pollInterval);
          setTimeout(() => onPaymentConfirmed?.(), 2000);
        }
      } catch (err) {
        console.error('Erro ao verificar status do pedido:', err);
      }
    }, 4000);

    // Subscription em tempo real
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.data?.cart_id === cartId && event.data?.status === 'paid') {
        setStatus('paid');
        clearInterval(pollInterval);
        setTimeout(() => onPaymentConfirmed?.(), 2000);
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [cartId, paymentUrl]);

  if (status === 'paid') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
          <CheckCircle2 size={36} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-foreground">Pagamento Confirmado!</h3>
          <p className="text-sm text-muted-foreground mt-2">Seu pedido foi pago com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Loading overlay enquanto iframe carrega */}
      {!iframeLoaded && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando página de pagamento...</p>
        </div>
      )}

      <iframe
        src={paymentUrl}
        title="Pagamento"
        className={`flex-1 w-full border-0 ${iframeLoaded ? 'block' : 'hidden'}`}
        style={{ minHeight: 0 }}
        onLoad={() => setIframeLoaded(true)}
        allow="payment"
      />

      {/* Fallback caso o iframe seja bloqueado */}
      {iframeLoaded && (
        <div className="border-t border-slate-100 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">Problema ao exibir? Abra em nova aba:</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => window.open(paymentUrl, '_blank')}
          >
            <ExternalLink size={12} />
            Abrir em nova aba
          </Button>
        </div>
      )}
    </div>
  );
}