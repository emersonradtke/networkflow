import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminCardRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await base44.entities.CardRequest.filter(
        { status: 'pending' },
        '-created_date'
      );
      setRequests(data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    setUpdatingId(request.id);
    try {
      await base44.entities.CardRequest.update(request.id, {
        status: 'approved',
        admin_notes: notes
      });

      if (request.request_type === 'new_request') {
        await base44.entities.Associate.update(request.associate_id, {
          has_boldlife_card: true,
          card_activation_month: new Date().toISOString().slice(0, 7)
        });
      } else {
        await base44.entities.Associate.update(request.associate_id, {
          has_boldlife_card: true,
          card_activation_month: new Date().toISOString().slice(0, 7)
        });
      }

      toast.success('Solicitação aprovada!');
      setShowDetailsModal(false);
      setNotes('');
      loadRequests();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao aprovar');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (request) => {
    setUpdatingId(request.id);
    try {
      await base44.entities.CardRequest.update(request.id, {
        status: 'rejected',
        admin_notes: notes
      });
      toast.success('Solicitação rejeitada');
      setShowDetailsModal(false);
      setNotes('');
      loadRequests();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao rejeitar');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusIcons = {
    pending: <Clock size={16} className="text-yellow-600" />,
    in_progress: <Clock size={16} className="text-blue-600" />,
    approved: <CheckCircle size={16} className="text-green-600" />,
    rejected: <XCircle size={16} className="text-red-600" />
  };

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em Análise',
    approved: 'Aprovado',
    rejected: 'Rejeitado'
  };

  const requestTypeLabels = {
    new_request: 'Solicitação Nova',
    already_has: 'Já Possui Cartão'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <CreditCard size={28} />
          Solicitações de Cartão BoldLife
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie as solicitações de cartão dos associados</p>
      </div>

      {requests.length === 0 ? (
        <div className="dark-card rounded-2xl p-12 text-center">
          <CreditCard size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(request => (
            <div key={request.id} className="dark-card rounded-xl p-4 border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-foreground">{request.associate_name}</h3>
                    <Badge variant="outline" className="text-xs">
                      <span className="flex items-center gap-1">
                        {statusIcons[request.status]}
                        {statusLabels[request.status]}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">ID: {request.associate_id}</p>
                  <Badge className="bg-primary/10 text-primary text-xs">
                    {requestTypeLabels[request.request_type]}
                  </Badge>
                  {request.admin_notes && (
                    <div className="mt-3 p-2 rounded bg-secondary/50 border-l-2 border-primary">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Notas: </span>
                        {request.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setNotes(request.admin_notes || '');
                    setShowDetailsModal(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <MessageSquare size={14} />
                  Detalhes
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDetailsModal} onOpenChange={(open) => !open && setShowDetailsModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Analisar Solicitação</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Associado</p>
                <p className="text-sm font-medium text-foreground">{selectedRequest.associate_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Tipo de Solicitação</p>
                <p className="text-sm text-foreground">{requestTypeLabels[selectedRequest.request_type]}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block">
                  Orientações/Notas para o Associado
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione instruções ou observações sobre como obter o cartão..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm resize-none"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleReject(selectedRequest)}
                  disabled={updatingId === selectedRequest.id}
                  variant="destructive"
                  className="flex-1"
                >
                  Rejeitar
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={updatingId === selectedRequest.id}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {updatingId === selectedRequest.id ? 'Processando...' : 'Aprovar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}