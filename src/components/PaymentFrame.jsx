import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PaymentFrame({ paymentUrl, cartId, onPaymentConfirmed }) {
  const [status, setStatus] = useState('pending'); // pending | paid | error
  const [popupRef, setPopupRef] = useState(null);

  useEffect(() => {
    if (!cartId || !paymentUrl) return;

    let unsubscribe = null;

    // Abrir popup de pagamento ANTES de observar mudanças
    const w = window.open(paymentUrl, 'InfinitePay', 'width=500,height=700');
    setPopupRef(w);

    // Observar mudanças nos pedidos do carrinho
    unsubscribe = base44.entities.Order.subscribe((event) => {
      // Aguardar o webhook atualizar qualquer pedido deste carrinho para 'paid'
      if (event.data?.cart_id === cartId && event.data?.status === 'paid') {
        setStatus('paid');
        // Fechar popup após confirmação
        if (w && !w.closed) {
          w.close();
        }
        // Executar callback imediatamente após confirmação
        setTimeout(() => {
          onPaymentConfirmed?.();
        }, 2000);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (w && !w.closed) w.close();
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
          <p className="text-sm text-muted-foreground mt-2">Seu pagamento foi processado com sucesso. Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center animate-spin" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
          <Loader2 size={28} className="text-primary" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground">Processando Pagamento</h3>
        <p className="text-sm text-muted-foreground mt-2">A janela de pagamento está aberta. Complete o pagamento para continuar aqui.</p>
      </div>
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
        <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">Se a janela foi bloqueada, verifique as configurações de popup do seu navegador.</p>
      </div>
    </div>
  );
}