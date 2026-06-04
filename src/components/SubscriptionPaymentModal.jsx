import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { add } from 'date-fns';

export default function SubscriptionPaymentModal({ isOpen, onClose, associate, onSuccess, networkConfig }) {
  const [step, setStep] = useState('confirm'); // confirm, processing, success
  const [loading, setLoading] = useState(false);
  const subscriptionPrice = networkConfig?.adhesion_price;

  const handlePayment = async () => {
    setLoading(true);
    setStep('processing');
    try {
      // Chamar checkout para pagamento da assinatura
      const response = await base44.functions.invoke('createInfinitePayCheckout', {
        associate_id: associate.id,
        type: 'subscription',
        amount: subscriptionPrice
      });

      if (response.data?.checkout_url) {
        // Abrir checkout em nova aba
        const popup = window.open(response.data.checkout_url, '_blank', 'width=800,height=600');
        
        // Verificar pagamento a cada 3 segundos
        const interval = setInterval(async () => {
          try {
            const subs = await base44.entities.Subscription.filter({ associate_id: associate.id });
            if (subs.length > 0 && subs[0].status === 'active') {
              clearInterval(interval);
              if (popup && !popup.closed) popup.close();
              setStep('success');
              setTimeout(() => {
                onSuccess?.();
                onClose();
              }, 2000);
            }
          } catch (err) {
            console.error('Erro ao verificar pagamento:', err);
          }
        }, 3000);

        // Limpar intervalo se modal fechar
        const timeout = setTimeout(() => clearInterval(interval), 600000); // 10 min
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setStep('confirm');
      alert('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ativar Assinatura</DialogTitle>
          <DialogDescription>Válida por 1 ano a partir da ativação</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'confirm' && (
            <>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor da assinatura:</span>
                      <span className="font-semibold">R$ {subscriptionPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Período:</span>
                      <span className="font-semibold">12 meses</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg">R$ {subscriptionPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-blue-700">
                  Você será redirecionado para confirmar o pagamento. Após confirmação, sua assinatura será ativada imediatamente.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handlePayment} disabled={loading || !subscriptionPrice} className="flex-1 bg-primary">
                  {loading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pagamento'
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 size={40} className="mx-auto mb-4 animate-spin text-primary" />
              <p className="font-semibold">Processando pagamento...</p>
              <p className="text-sm text-gray-500 mt-2">Você será redirecionado ao gateway de pagamento</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-600" />
              <p className="font-semibold text-lg">Assinatura Ativada!</p>
              <p className="text-sm text-gray-500 mt-2">Sua assinatura será renovada em 12 meses</p>
              <Button onClick={onClose} className="w-full mt-4 bg-primary">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}