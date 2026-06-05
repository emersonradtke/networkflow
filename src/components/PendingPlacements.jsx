import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';

export default function PendingPlacements({ associateId, onAccepted }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (associateId) loadRequests();
  }, [associateId]);

  const loadRequests = async () => {
    const data = await base44.entities.PlacementRequest.filter({
      target_sponsor_id: associateId,
      status: 'pending',
    }, '-created_date');
    setRequests(data);
    setLoading(false);
  };

  const dismissPlacementNotifications = async (req) => {
    const notifs = await base44.entities.Notification.filter({
      associate_id: associateId,
      is_read: false,
    });
    // Marcar como lida qualquer notificação de colocação relacionada a este associado
    const toRead = notifs.filter(n =>
      n.title?.includes('Colocação') || n.message?.includes(req.associate_name)
    );
    await Promise.all(toRead.map(n =>
      base44.entities.Notification.update(n.id, { is_read: true })
    ));
  };

  const accept = async (req) => {
    setProcessing(req.id);
    await base44.entities.Associate.update(req.associate_id, {
      sponsor_id: associateId,
      sponsor_name: req.target_sponsor_name,
      status: 'active',
      adhesion_paid: true,
    });
    await base44.entities.PlacementRequest.update(req.id, { status: 'accepted' });
    await base44.entities.Notification.create({
      associate_id: req.associate_id,
      title: 'Colocação Aceita! 🎉',
      message: `${req.target_sponsor_name} aceitou sua colocação na rede. Sua conta foi ativada!`,
      type: 'activation',
      is_read: false,
    });
    await dismissPlacementNotifications(req);
    setProcessing(null);
    loadRequests();
    if (onAccepted) onAccepted();
  };

  const reject = async (req) => {
    setProcessing(req.id);
    // Rejeitar a solicitação e devolver status awaiting_placement para o admin realocar
    await Promise.all([
      base44.entities.PlacementRequest.update(req.id, { status: 'rejected' }),
      base44.entities.Associate.update(req.associate_id, { status: 'awaiting_placement' }),
    ]);
    await base44.entities.Notification.create({
      associate_id: req.associate_id,
      title: 'Solicitação Recusada',
      message: `${req.target_sponsor_name} não pôde aceitar sua colocação no momento. Aguarde nova tentativa pelo administrador.`,
      type: 'system',
      is_read: false,
    });
    await dismissPlacementNotifications(req);
    setProcessing(null);
    loadRequests();
  };

  if (loading || requests.length === 0) return null;

  return (
    <div className="dark-card rounded-2xl p-5 border border-blue-100 bg-blue-50/40">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
          <UserPlus size={15} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">Solicitações de Colocação</h3>
          <p className="text-xs text-muted-foreground">Associados aguardando entrar na sua rede</p>
        </div>
        <Badge className="ml-auto bg-blue-500 text-white border-0">{requests.length}</Badge>
      </div>

      <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
              {req.associate_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{req.associate_name}</p>
              </div>
              {req.original_sponsor_name && (
                <p className="text-xs text-muted-foreground">Indicado por: {req.original_sponsor_name}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                disabled={!!processing}
                onClick={() => accept(req)}
                className="text-white text-xs gap-1 h-8"
                style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
              >
                {processing === req.id ? '...' : <><CheckCircle size={12} /> Aceitar</>}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!!processing}
                onClick={() => reject(req)}
                className="text-red-500 border-red-200 hover:bg-red-50 text-xs gap-1 h-8"
              >
                <XCircle size={12} /> Recusar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}