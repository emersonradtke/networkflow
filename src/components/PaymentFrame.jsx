import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentFrame({ paymentUrl, cartId, onPaymentConfirmed }) {
  const [status, setStatus] = useState('pending'); // pending | paid
  const [opened, setOpened] = useState(false);

  const openPayment = () => {
    window.open(paymentUrl, '_blank');
    setOpened(true);
  };

  useEffect(() => {
    if (!cartId || !paymentUrl) return;

    // Abre automaticamente ao montar
    openPayment();

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
          <p className="text-sm text-muted-foreground mt-2">Seu pedido foi pago com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      {/* Spinner animado */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground">Aguardando Pagamento</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          A página de pagamento foi aberta em uma nova aba.<br />
          Complete o pagamento lá e a confirmação aparecerá aqui automaticamente.
        </p>
      </div>

      <div className="w-full space-y-2">
        <Button
          className="w-full gap-2 font-semibold"
          style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
          onClick={openPayment}
        >
          <ExternalLink size={15} />
          {opened ? 'Abrir pagamento novamente' : 'Abrir pagamento'}
        </Button>

        <p className="text-xs text-muted-foreground">
          Esta tela ficará aguardando a confirmação automática do pagamento.
        </p>
      </div>
    </div>
  );
}