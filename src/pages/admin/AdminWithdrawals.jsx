import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => { loadWithdrawals(); }, []);

  const loadWithdrawals = async () => {
    const data = await base44.entities.WithdrawalRequest.list('-created_date');
    setWithdrawals(data);
    setLoading(false);
  };

  const approve = async (w) => {
    await base44.entities.WithdrawalRequest.update(w.id, { status: 'paid', paid_at: new Date().toISOString() });
    // Deduct from wallet
    const assocList = await base44.entities.Associate.filter({ id: w.associate_id });
    if (assocList.length > 0) {
      const assoc = assocList[0];
      await base44.entities.Associate.update(assoc.id, {
        wallet_balance: Math.max(0, (assoc.wallet_balance || 0) - w.amount),
        total_withdrawn: (assoc.total_withdrawn || 0) + w.amount,
      });
    }
    await base44.entities.Notification.create({
      associate_id: w.associate_id,
      title: 'Saque Aprovado! ✅',
      message: `Seu saque de R$ ${w.amount?.toFixed(2)} foi aprovado e está a caminho.`,
      type: 'withdrawal',
      is_read: false,
    });
    loadWithdrawals();
  };

  const reject = async () => {
    await base44.entities.WithdrawalRequest.update(rejectDialog.id, { status: 'rejected', admin_notes: rejectNote });
    await base44.entities.Notification.create({
      associate_id: rejectDialog.associate_id,
      title: 'Saque Rejeitado',
      message: `Seu saque de R$ ${rejectDialog.amount?.toFixed(2)} foi rejeitado. ${rejectNote ? 'Motivo: ' + rejectNote : ''}`,
      type: 'withdrawal',
      is_read: false,
    });
    setRejectDialog(null);
    setRejectNote('');
    loadWithdrawals();
  };

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      approved: { label: 'Aprovado', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      paid: { label: 'Pago', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
      rejected: { label: 'Rejeitado', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };
    const s = map[status] || map.pending;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const filtered = withdrawals
    .filter(w => filter === 'all' || w.status === filter)
    .filter(w => w.associate_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Saques</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie as solicitações de saque</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 bg-secondary border-border text-foreground" placeholder="Buscar por associado..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'paid', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f ? 'gold-gradient text-background' : 'bg-secondary text-muted-foreground'}`}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'paid' ? 'Pagos' : 'Rejeitados'}
            </button>
          ))}
        </div>
      </div>

      <div className="dark-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(w => (
              <div key={w.id} className="p-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{w.associate_name}</p>
                    <p className="text-xs text-muted-foreground">{w.pix_key || w.bank_info || 'Sem dados bancários'}</p>
                    {w.admin_notes && <p className="text-xs text-red-400 mt-0.5">{w.admin_notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-primary">R$ {w.amount?.toFixed(2)}</p>
                    {statusBadge(w.status)}
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" className="h-7 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 gap-1" onClick={() => approve(w)}>
                        <CheckCircle size={12} /> Pagar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300" onClick={() => { setRejectDialog(w); setRejectNote(''); }}>
                        <XCircle size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-black">Rejeitar Saque</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Informe o motivo da rejeição (opcional):</p>
          <Input className="bg-secondary border-border text-foreground" placeholder="Motivo..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" onClick={reject}>Confirmar Rejeição</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}