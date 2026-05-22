import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ExternalLinksManager() {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('submitted');
  const [selectedClick, setSelectedClick] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadClicks();
  }, [filter]);

  const loadClicks = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ExternalLinkClick.filter({ status: filter }, '-clicked_at', 100);
      setClicks(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (clickId, approved) => {
    try {
      await base44.functions.invoke('approvePurchaseClick', {
        click_id: clickId,
        approved: approved,
        admin_notes: adminNotes
      });
      setSelectedClick(null);
      setAdminNotes('');
      loadClicks();
    } catch (e) {
      alert('Erro ao processar');
    }
  };

  const statusConfig = {
    intent: { label: 'Intenção', color: 'bg-blue-100 text-blue-800' },
    submitted: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['submitted', 'approved', 'rejected', 'intent'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {statusConfig[status].label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : clicks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum registro</div>
      ) : (
        <div className="space-y-4">
          {clicks.map((click) => (
            <div key={click.id} className="p-4 rounded-lg border border-border bg-card flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-foreground">{click.associate_name}</h3>
                  <Badge className={statusConfig[click.status].color}>{statusConfig[click.status].label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {click.link_type === 'product' ? `Produto: ${click.product_name}` : `Banner: ${click.banner_name}`}
                </p>
                {click.purchase_amount && (
                  <p className="text-sm font-semibold mt-1">
                    Compra: R$ {click.purchase_amount.toFixed(2)} | Comissão: R$ {click.commission_amount.toFixed(2)}
                  </p>
                )}
              </div>
              {click.status === 'submitted' && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedClick(click)}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(click.id, true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApprove(click.id, false)}
                  >
                    <XCircle size={16} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedClick} onOpenChange={(open) => { if (!open) setSelectedClick(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedClick && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Associado</p>
                <p className="font-bold">{selectedClick.associate_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-bold">R$ {selectedClick.purchase_amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissão</p>
                  <p className="font-bold">R$ {selectedClick.commission_amount?.toFixed(2)}</p>
                </div>
              </div>
              {selectedClick.purchase_proof_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Comprovante</p>
                  <img src={selectedClick.purchase_proof_url} alt="Comprovante" className="max-h-64 rounded" />
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground">Observações do Admin</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                  rows="3"
                  placeholder="Motivo da rejeição ou observações..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="destructive" onClick={() => handleApprove(selectedClick.id, false)} className="flex-1">
                  Rejeitar
                </Button>
                <Button onClick={() => handleApprove(selectedClick.id, true)} className="flex-1 bg-green-600 hover:bg-green-700">
                  Aprovar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}