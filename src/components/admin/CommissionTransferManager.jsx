import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRightLeft, CheckCircle, XCircle, Clock, Monitor, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CommissionTransferManager() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadTransfers(); }, [filter]);

  const loadTransfers = async () => {
    setLoading(true);
    const query = filter === 'all' ? {} : { status: filter };
    const data = await base44.entities.CommissionTransfer.filter(query, '-created_date', 50);
    setTransfers(data);
    setLoading(false);
  };

  const approve = async () => {
    setProcessing(true);
    const t = selected;

    // Buscar saldos atuais dos associados
    const [fromAssoc, toAssoc] = await Promise.all([
      base44.entities.Associate.filter({ id: t.from_associate_id }),
      base44.entities.Associate.filter({ id: t.to_associate_id }),
    ]);

    const from = fromAssoc[0];
    const to = toAssoc[0];

    if (!from || !to) { alert('Associado não encontrado.'); setProcessing(false); return; }
    if ((from.wallet_balance || 0) < t.amount) { alert('Saldo insuficiente na origem.'); setProcessing(false); return; }

    const fromBefore = from.wallet_balance || 0;
    const toBefore = to.wallet_balance || 0;

    // Debitar origem e creditar destino
    await Promise.all([
      base44.entities.Associate.update(from.id, {
        wallet_balance: fromBefore - t.amount,
      }),
      base44.entities.Associate.update(to.id, {
        wallet_balance: toBefore + t.amount,
      }),
    ]);

    // Atualizar transferência com valores reais no momento da aprovação
    await base44.entities.CommissionTransfer.update(t.id, {
      status: 'approved',
      admin_notes: adminNotes,
      from_balance_before: fromBefore,
      from_balance_after: fromBefore - t.amount,
      to_balance_before: toBefore,
      to_balance_after: toBefore + t.amount,
      processed_at: new Date().toISOString(),
    });

    // Notificar ambos
    await Promise.all([
      base44.entities.Notification.create({
        associate_id: t.from_associate_id,
        title: 'Transferência Aprovada ✅',
        message: `Sua transferência de R$ ${t.amount.toFixed(2)} para ${t.to_associate_name} foi aprovada. Novo saldo: R$ ${(fromBefore - t.amount).toFixed(2)}.`,
        type: 'commission',
        is_read: false,
      }),
      base44.entities.Notification.create({
        associate_id: t.to_associate_id,
        title: 'Você Recebeu uma Transferência 💰',
        message: `${t.from_associate_name} transferiu R$ ${t.amount.toFixed(2)} para você. Novo saldo: R$ ${(toBefore + t.amount).toFixed(2)}.`,
        type: 'commission',
        is_read: false,
      }),
    ]);

    setSelected(null);
    setAdminNotes('');
    setProcessing(false);
    loadTransfers();
  };

  const reject = async () => {
    setProcessing(true);
    const t = selected;

    await base44.entities.CommissionTransfer.update(t.id, {
      status: 'rejected',
      admin_notes: adminNotes,
      processed_at: new Date().toISOString(),
    });

    await base44.entities.Notification.create({
      associate_id: t.from_associate_id,
      title: 'Transferência Recusada',
      message: `Sua solicitação de transferência de R$ ${t.amount.toFixed(2)} para ${t.to_associate_name} foi recusada pelo administrador.${adminNotes ? ' Motivo: ' + adminNotes : ''}`,
      type: 'system',
      is_read: false,
    });

    setSelected(null);
    setAdminNotes('');
    setProcessing(false);
    loadTransfers();
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
      approved: { label: 'Aprovado', cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
      rejected: { label: 'Rejeitado', cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
    };
    const s = map[status] || map.pending;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return d; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            style={filter === f ? { background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' } : {}}
          >
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : f === 'rejected' ? 'Recusadas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />)}</div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <ArrowRightLeft size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma transferência encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transfers.map(t => (
            <div
              key={t.id}
              className="border border-slate-200 rounded-xl p-4 bg-white hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => { setSelected(t); setAdminNotes(t.admin_notes || ''); }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1B2A5E20,#3B9EE220)' }}>
                  <ArrowRightLeft size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{t.from_associate_name}</span>
                    <ArrowRightLeft size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">{t.to_associate_name}</span>
                    {statusBadge(t.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.requested_at || t.created_date)}</p>
                  {t.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{t.notes}"</p>}
                </div>
                <span className="text-base font-black text-primary shrink-0">R$ {t.amount?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhe / ação */}
      {selected && (
        <Dialog open onOpenChange={() => { setSelected(null); setAdminNotes(''); }}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="font-black flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-primary" /> Detalhe da Transferência
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Partes envolvidas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs text-muted-foreground mb-1">Origem (débito)</p>
                  <p className="font-bold text-foreground">{selected.from_associate_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Antes: R$ {selected.from_balance_before?.toFixed(2)}</p>
                  <p className="text-xs text-red-600 font-semibold">Depois: R$ {selected.from_balance_after?.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-xs text-muted-foreground mb-1">Destino (crédito)</p>
                  <p className="font-bold text-foreground">{selected.to_associate_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Antes: R$ {selected.to_balance_before?.toFixed(2)}</p>
                  <p className="text-xs text-green-600 font-semibold">Depois: R$ {selected.to_balance_after?.toFixed(2)}</p>
                </div>
              </div>

              {/* Valor */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Valor da Transferência</p>
                <p className="text-2xl font-black text-primary">R$ {selected.amount?.toFixed(2)}</p>
              </div>

              {/* Log de auditoria */}
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Log de Auditoria</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={11} /> Solicitado em: <span className="text-foreground">{formatDate(selected.requested_at || selected.created_date)}</span>
                  </div>
                  {selected.processed_at && (
                    <div className="flex items-center gap-2">
                      <Clock size={11} /> Processado em: <span className="text-foreground">{formatDate(selected.processed_at)}</span>
                    </div>
                  )}
                  {selected.ip_address && (
                    <div className="flex items-center gap-2">
                      <Monitor size={11} /> IP: <span className="text-foreground font-mono">{selected.ip_address}</span>
                    </div>
                  )}
                  {selected.user_agent && (
                    <div className="flex gap-2">
                      <Monitor size={11} className="shrink-0 mt-0.5" />
                      <span className="break-all">{selected.user_agent}</span>
                    </div>
                  )}
                  {selected.notes && (
                    <div className="pt-1 border-t border-slate-200">
                      Observação: <span className="text-foreground italic">"{selected.notes}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status atual */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                {selected.status === 'pending' ? <Badge className="bg-yellow-500/20 text-yellow-600">Pendente</Badge>
                  : selected.status === 'approved' ? <Badge className="bg-green-500/20 text-green-600">Aprovado</Badge>
                  : <Badge className="bg-red-500/20 text-red-600">Rejeitado</Badge>}
              </div>

              {selected.admin_notes && selected.status !== 'pending' && (
                <p className="text-xs text-muted-foreground italic">Nota admin: "{selected.admin_notes}"</p>
              )}

              {/* Ações admin (apenas para pendentes) */}
              {selected.status === 'pending' && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div>
                    <Label>Observação do Admin (opcional)</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Motivo da aprovação ou recusa..."
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1 font-bold text-white"
                      style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                      onClick={approve}
                      disabled={processing}
                    >
                      <CheckCircle size={14} /> {processing ? '...' : 'Aprovar'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-1 text-red-500 border-red-200 hover:bg-red-50"
                      onClick={reject}
                      disabled={processing}
                    >
                      <XCircle size={14} /> Recusar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}