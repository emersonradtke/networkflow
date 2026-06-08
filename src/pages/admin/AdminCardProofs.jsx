import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Eye, CreditCard, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminCardProofs() {
  const [proofs, setProofs] = useState([]);
  const [associates, setAssociates] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [allProofs, allAssociates] = await Promise.all([
      base44.entities.CardSpendingProof.list('-created_date', 200),
      base44.entities.Associate.list(),
    ]);
    const assocMap = {};
    allAssociates.forEach(a => { assocMap[a.id] = a; });
    setAssociates(assocMap);
    setProofs(allProofs);
    setLoading(false);
  };

  const handleApprove = async (proof) => {
    setProcessing(proof.id);
    try {
      await base44.entities.CardSpendingProof.update(proof.id, {
        status: 'approved',
        admin_notes: adminNotes || undefined,
        approved_at: new Date().toISOString(),
      });
      // Notifica o associado
      await base44.entities.Notification.create({
        associate_id: proof.associate_id,
        title: 'Comprovante de Cartão Aprovado ✅',
        message: `Seu comprovante de gasto de R$ ${proof.spending_amount?.toFixed(2)} referente a ${proof.month} foi aprovado!`,
        type: 'system',
        is_read: false,
      });
      toast.success('Comprovante aprovado!');
      setSelected(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      toast.error('Erro ao aprovar: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (proof) => {
    if (!adminNotes.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    setProcessing(proof.id);
    try {
      await base44.entities.CardSpendingProof.update(proof.id, {
        status: 'rejected',
        admin_notes: adminNotes,
      });
      await base44.entities.Notification.create({
        associate_id: proof.associate_id,
        title: 'Comprovante Rejeitado ❌',
        message: `Seu comprovante de gasto referente a ${proof.month} foi rejeitado. Motivo: ${adminNotes}`,
        type: 'system',
        is_read: false,
      });
      toast.success('Comprovante rejeitado.');
      setSelected(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      toast.error('Erro ao rejeitar: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', cls: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
      approved: { label: 'Aprovado', cls: 'bg-green-500/20 text-green-700 border-green-500/30' },
      rejected: { label: 'Rejeitado', cls: 'bg-red-500/20 text-red-700 border-red-500/30' },
    };
    const s = map[status] || map.pending;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const filtered = proofs.filter(p => filter === 'all' || p.status === filter);
  const pendingCount = proofs.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard size={24} className="text-primary" />
        <div>
          <h1 className="text-2xl font-black text-foreground">Comprovantes de Cartão</h1>
          <p className="text-muted-foreground text-sm mt-1">Aprove ou rejeite os comprovantes de gasto enviados pelos associados</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="ml-auto bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-sm px-3 py-1">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: 'Pendentes' },
          { key: 'approved', label: 'Aprovados' },
          { key: 'rejected', label: 'Rejeitados' },
          { key: 'all', label: 'Todos' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.key ? 'text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            style={filter === f.key ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum comprovante {filter !== 'all' ? `com status "${filter === 'pending' ? 'pendente' : filter === 'approved' ? 'aprovado' : 'rejeitado'}"` : ''}.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(proof => {
              const assoc = associates[proof.associate_id];
              return (
                <div key={proof.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 text-sm"
                    style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                    {assoc?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{assoc?.full_name || proof.associate_id}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Mês: <span className="font-medium text-foreground">{proof.month}</span></span>
                      <span className="text-xs text-muted-foreground">Valor: <span className="font-bold text-green-600">R$ {proof.spending_amount?.toFixed(2)}</span></span>
                      {proof.created_date && (
                        <span className="text-xs text-muted-foreground">
                          Enviado: {new Date(proof.created_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(proof.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelected(proof); setAdminNotes(proof.admin_notes || ''); }}
                      className="gap-1 text-xs"
                    >
                      <Eye size={13} /> Ver
                    </Button>
                    {proof.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => { setSelected(proof); setAdminNotes(''); }}
                          className="gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle size={13} /> Aprovar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalhe / aprovação */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setAdminNotes(''); }}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <CreditCard size={18} /> Comprovante de Cartão
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Associado</p>
                  <p className="font-semibold">{associates[selected.associate_id]?.full_name || selected.associate_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mês de Referência</p>
                  <p className="font-semibold">{selected.month}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Declarado</p>
                  <p className="font-bold text-green-600 text-base">R$ {selected.spending_amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {statusBadge(selected.status)}
                </div>
              </div>

              {/* Comprovantes */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-semibold">Comprovante(s) anexado(s)</p>
                {selected.proof_url ? (
                  <div className="space-y-2">
                    {/* Tenta renderizar como imagem, senão mostra link */}
                    <a
                      href={selected.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition text-sm text-primary font-medium"
                    >
                      <ExternalLink size={14} /> Abrir comprovante
                    </a>
                    <img
                      src={selected.proof_url}
                      alt="Comprovante"
                      className="rounded-lg border border-border max-h-48 w-full object-contain bg-secondary"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum comprovante anexado.</p>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {selected.status === 'pending' ? 'Observações (obrigatório para rejeitar)' : 'Observações do Admin'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  disabled={selected.status !== 'pending'}
                  rows={3}
                  placeholder="Ex: Comprovante ilegível, valor insuficiente..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm resize-none disabled:opacity-60"
                />
              </div>

              {selected.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleReject(selected)}
                    disabled={!!processing}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                  >
                    <XCircle size={15} /> Rejeitar
                  </Button>
                  <Button
                    onClick={() => handleApprove(selected)}
                    disabled={!!processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <CheckCircle size={15} />
                    {processing === selected.id ? 'Processando...' : 'Aprovar'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}