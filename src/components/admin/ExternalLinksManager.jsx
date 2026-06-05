import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Eye, Trash2 } from 'lucide-react';
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
      const query = filter === 'all' ? {} : { status: filter };
      const data = await base44.entities.ExternalLinkClick.filter(query, '-created_date', 100);
      setClicks(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approved) => {
    try {
      await base44.functions.invoke('approvePurchaseClick', {
        click_id: selectedClick.id,
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

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar?')) return;
    try {
      await base44.entities.ExternalLinkClick.delete(id);
      loadClicks();
    } catch (e) {
      alert('Erro ao deletar');
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
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['submitted', 'approved', 'rejected', 'intent', 'all'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            size="sm"
          >
            {status === 'all' ? 'Todos' : statusConfig[status]?.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : clicks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum registro</div>
      ) : (
        <div className="space-y-3">
          {clicks.map((click) => (
            <div key={click.id} className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground truncate">{click.associate_name}</h3>
                    <Badge className={statusConfig[click.status].color} variant="outline">
                      {statusConfig[click.status].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {click.link_type === 'product' ? `📦 ${click.product_name}` : `🎨 ${click.banner_name}`}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold text-foreground">
                        R$ {(click.purchase_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Comissão</p>
                      <p className="font-semibold text-green-500">
                        R$ {(click.commission_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data/Hora</p>
                      <p className="font-semibold text-foreground">
                        {new Date(click.created_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-semibold text-foreground">
                        {click.link_type === 'product' ? 'Produto' : 'Banner'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedClick(click);
                      setAdminNotes(click.admin_notes || '');
                    }}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(click.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedClick} onOpenChange={(open) => { if (!open) { setSelectedClick(null); setAdminNotes(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Intenção de Compra</DialogTitle>
          </DialogHeader>
          {selectedClick && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Associado</p>
                <p className="text-sm font-medium text-foreground mt-1">{selectedClick.associate_name}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Produto/Banner</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {selectedClick.product_name || selectedClick.banner_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    R$ {(selectedClick.purchase_amount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Comissão</p>
                  <p className="text-sm font-semibold text-green-500 mt-1">
                    R$ {(selectedClick.commission_amount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data e Hora</p>
                <p className="text-sm text-foreground mt-1">
                  {new Date(selectedClick.created_date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                  })}
                </p>
              </div>

              {selectedClick.purchase_proof_url && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Comprovante de Compra</p>
                  <img src={selectedClick.purchase_proof_url} alt="Comprovante" className="rounded-lg max-h-48 w-full object-cover border border-border" />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Notas Administrativas</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione notas internas..."
                  className="mt-2 text-xs"
                  rows={3}
                />
              </div>

              {selectedClick.status === 'submitted' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleApprove(false)}
                  >
                    <XCircle size={14} className="mr-1" />
                    Rejeitar
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(true)}
                  >
                    <CheckCircle2 size={14} className="mr-1" />
                    Aprovar
                  </Button>
                </div>
              )}

              {selectedClick.status === 'approved' && (
                <div className="p-3 rounded-lg bg-green-100 text-green-800 text-xs font-medium">
                  ✓ Aprovado - Comissão e pontuação foram creditadas
                </div>
              )}

              {selectedClick.status === 'rejected' && (
                <div className="p-3 rounded-lg bg-red-100 text-red-800 text-xs font-medium">
                  ✗ Rejeitado
                </div>
              )}

              {selectedClick.status === 'intent' && (
                <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-medium">
                  ⏳ Intenção registrada - Aguardando comprovante do associado
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}