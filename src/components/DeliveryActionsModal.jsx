import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertTriangle, Package } from 'lucide-react';

export default function DeliveryActionsModal({ order, open, onClose, onDone }) {
  const [mode, setMode] = useState(null); // 'confirm' | 'ticket'
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmDelivery = async () => {
    setLoading(true);
    await base44.entities.Order.update(order.id, { delivery_status: 'delivered' });
    onDone?.();
    onClose();
  };

  const handleOpenTicket = async () => {
    if (!description.trim()) return;
    setLoading(true);
    await base44.entities.SupportTicket.create({
      order_id: order.id,
      order_number: order.order_number,
      associate_id: order.associate_id,
      associate_name: order.associate_name,
      product_name: order.product_name,
      type: 'not_delivered',
      description: description.trim(),
      status: 'open',
    });
    await base44.entities.Order.update(order.id, { delivery_status: 'returned' });
    onDone?.();
    onClose();
  };

  const reset = () => { setMode(null); setDescription(''); setLoading(false); };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="font-black text-base">
            Pedido #{order?.order_number} — {order?.product_name}
          </DialogTitle>
        </DialogHeader>

        {!mode && (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">O que deseja fazer com este pedido?</p>
            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={() => setMode('confirm')}
            >
              <CheckCircle size={16} /> Confirmar Recebimento
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 font-bold"
              onClick={() => setMode('ticket')}
            >
              <AlertTriangle size={16} /> Abrir Chamado — Não Recebi
            </Button>
          </div>
        )}

        {mode === 'confirm' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle size={20} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-800">Confirmar que você recebeu o pedido em perfeitas condições?</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={loading}>Voltar</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleConfirmDelivery} disabled={loading}>
                {loading ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        )}

        {mode === 'ticket' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-800">Descreva o problema com a entrega para abrirmos o chamado.</p>
            </div>
            <Textarea
              placeholder="Ex: O pedido foi marcado como entregue mas não recebi nada. Código de rastreio mostra entregue mas ninguém bateu na minha porta."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={loading}>Voltar</Button>
              <Button
                className="flex-1 font-bold text-white"
                style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                onClick={handleOpenTicket}
                disabled={loading || !description.trim()}
              >
                {loading ? 'Abrindo...' : 'Abrir Chamado'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}