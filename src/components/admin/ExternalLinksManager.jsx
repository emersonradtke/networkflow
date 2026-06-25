import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Eye, Trash2, Search, ExternalLink, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ExternalLinksManager() {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('submitted');
  const [selectedClick, setSelectedClick] = useState(null);
  const [selectedAssociate, setSelectedAssociate] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [search, setSearch] = useState('');
  const loadingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => loadClicks(), 400);
    return () => clearTimeout(timer);
  }, [filter]);

  const loadClicks = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      let query = {};
      if (filter === 'all') {
        query = {};
      } else if (filter === 'pending_reconciliation') {
        query = { status: 'approved', reconciliation_status: 'pending' };
      } else if (filter === 'reconciled') {
        query = { reconciliation_status: 'reconciled' };
      } else {
        query = { status: filter };
      }
      const data = await base44.entities.ExternalLinkClick.filter(query, '-created_date', 50);
      setClicks(data);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleRemoveProof = async (urlIndex) => {
    if (!confirm('Deseja remover este comprovante?')) return;
    const urls = selectedClick.purchase_proof_urls?.length
      ? [...selectedClick.purchase_proof_urls]
      : selectedClick.purchase_proof_url ? [selectedClick.purchase_proof_url] : [];
    urls.splice(urlIndex, 1);
    const update = {
      purchase_proof_urls: urls,
      purchase_proof_url: urls[0] || null,
    };
    if (urls.length === 0) {
      update.status = 'intent';
      update.purchase_amount = null;
    }
    await base44.entities.ExternalLinkClick.update(selectedClick.id, update);
    setSelectedClick(prev => ({ ...prev, ...update }));
    loadClicks();
  };

  const openDetails = async (click) => {
    setSelectedClick(click);
    setAdminNotes(click.admin_notes || '');
    setSelectedAssociate(null);
    if (click.associate_id) {
      try {
        const assoc = await base44.entities.Associate.get(click.associate_id);
        setSelectedAssociate(assoc);
      } catch (_) {}
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

  const reconciliationConfig = {
    pending: { label: 'Aguardando Conciliação', color: 'text-yellow-600' },
    reconciled: { label: 'Conciliado', color: 'text-green-600' }
  };

  const filtered = clicks.filter(c =>
    !search || (c.associate_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Busca por associado */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por associado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
         {['submitted', 'approved', 'rejected', 'intent', 'pending_reconciliation', 'reconciled', 'all'].map((status) => (
           <Button
             key={status}
             variant={filter === status ? 'default' : 'outline'}
             onClick={() => setFilter(status)}
             size="sm"
           >
             {status === 'all' ? 'Todos' : status === 'pending_reconciliation' ? 'Aguardando Conciliação' : status === 'reconciled' ? 'Conciliado' : statusConfig[status]?.label}
           </Button>
         ))}
       </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((click) => (
            <div key={click.id} className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                     <h3 className="font-semibold text-foreground truncate">{click.associate_name}</h3>
                     <Badge className={statusConfig[click.status].color} variant="outline">
                       {statusConfig[click.status].label}
                     </Badge>
                     {click.status === 'approved' && (
                       <Badge variant="outline" className={`text-xs ${reconciliationConfig[click.reconciliation_status || 'pending'].color}`}>
                         {reconciliationConfig[click.reconciliation_status || 'pending'].label}
                       </Badge>
                     )}
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
                    onClick={() => openDetails(click)}
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

      <Dialog open={!!selectedClick} onOpenChange={(open) => { if (!open) { setSelectedClick(null); setAdminNotes(''); setSelectedAssociate(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Intenção de Compra</DialogTitle>
          </DialogHeader>
          {selectedClick && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Dados do Associado */}
              <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Associado</p>
                <p className="text-sm font-semibold text-foreground">{selectedClick.associate_name || '—'}</p>
                {selectedAssociate ? (
                  <>
                    <p className="text-xs text-muted-foreground">{selectedAssociate.email}</p>
                    {selectedAssociate.phone && <p className="text-xs text-muted-foreground">📞 {selectedAssociate.phone}</p>}
                    {selectedAssociate.cpf && <p className="text-xs text-muted-foreground">CPF: {selectedAssociate.cpf}</p>}
                    {selectedAssociate.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {selectedAssociate.cnpj}</p>}
                    <Badge variant="outline" className="text-xs mt-1">{selectedAssociate.status}</Badge>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Carregando dados...</p>
                )}
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

              {/* Comprovantes */}
              {(() => {
                const urls = selectedClick.purchase_proof_urls?.length
                  ? selectedClick.purchase_proof_urls
                  : selectedClick.purchase_proof_url
                  ? [selectedClick.purchase_proof_url]
                  : [];
                if (urls.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                      Comprovante{urls.length > 1 ? 's' : ''} de Compra ({urls.length})
                    </p>
                    <div className="space-y-2">
                     {urls.map((url, idx) => {
                       const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                       return (
                         <div key={idx} className="rounded-lg border border-border overflow-hidden">
                           {isImage ? (
                             <a href={url} target="_blank" rel="noopener noreferrer">
                               <img src={url} alt={`Comprovante ${idx + 1}`} className="w-full max-h-48 object-cover hover:opacity-90 transition-opacity cursor-pointer" />
                             </a>
                           ) : null}
                           <div className="flex items-center gap-2 p-2 bg-secondary/30">
                             <a
                               href={url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center gap-2 text-xs text-primary hover:underline flex-1"
                             >
                               <ExternalLink size={12} />
                               {isImage ? 'Abrir imagem em nova aba' : `Abrir comprovante ${idx + 1}`}
                             </a>
                             <button
                               onClick={() => handleRemoveProof(idx)}
                               className="text-muted-foreground hover:text-destructive shrink-0"
                               title="Remover comprovante"
                             >
                               <X size={14} />
                             </button>
                           </div>
                         </div>
                       );
                     })}
                    </div>
                  </div>
                );
              })()}

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
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-green-100 text-green-800 text-xs font-medium">
                    ✓ Aprovado
                  </div>
                  {selectedClick.reconciliation_status === 'pending' && (
                    <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-medium">
                      ⏳ Aguardando conciliação - Comissão será creditada após confirmação
                    </div>
                  )}
                  {selectedClick.reconciliation_status === 'reconciled' && (
                    <div className="p-3 rounded-lg bg-green-100 text-green-800 text-xs font-medium">
                      ✓ Conciliado - Comissão e pontuação foram creditadas
                    </div>
                  )}
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