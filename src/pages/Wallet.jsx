import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Clock, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CommissionTransferModal from '@/components/CommissionTransferModal';

export default function Wallet() {
  const { associate } = useOutletContext();
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', pix_key: '', bank_info: '' });
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [myTransfers, setMyTransfers] = useState([]);

  useEffect(() => {
    if (associate?.id) loadData();
  }, [associate]);

  const loadData = async () => {
    const [comms, withds, configs, transfers] = await Promise.all([
      base44.entities.Commission.filter({ beneficiary_id: associate.id }, '-created_date', 20),
      base44.entities.WithdrawalRequest.filter({ associate_id: associate.id }, '-created_date', 10),
      base44.entities.NetworkConfig.list(),
      base44.entities.CommissionTransfer.filter({ from_associate_id: associate.id }, '-created_date', 10),
    ]);
    setCommissions(comms);
    setWithdrawals(withds);
    if (configs.length > 0) setConfig(configs[0]);
    setMyTransfers(transfers);
    setLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawForm.amount);
    const minAmount = config?.withdrawal_min_amount || 50;
    if (amount < minAmount) return alert(`Valor mínimo de saque: R$ ${minAmount.toFixed(2)}`);
    if (amount > (associate?.wallet_balance || 0)) return alert('Saldo insuficiente.');
    setSubmitting(true);
    await base44.entities.WithdrawalRequest.create({
      associate_id: associate.id,
      associate_name: associate.full_name,
      amount,
      pix_key: withdrawForm.pix_key,
      bank_info: withdrawForm.bank_info,
      status: 'pending',
    });
    setDialogOpen(false);
    setWithdrawForm({ amount: '', pix_key: '', bank_info: '' });
    loadData();
    setSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Carteira</h1>
        <p className="text-muted-foreground text-sm mt-1">Seus ganhos e histórico de transações</p>
      </div>

      {/* Balance Card */}
      <div className="gold-gradient rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <p className="text-sm font-medium text-background/80 mb-1">Saldo Disponível</p>
        <p className="text-4xl font-black text-background">R$ {(associate?.wallet_balance || 0).toFixed(2)}</p>
        <div className="flex gap-4 mt-4 text-sm">
          <div>
            <p className="text-background/70">Total Ganho</p>
            <p className="font-bold text-background">R$ {(associate?.total_earned || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-background/70">Sacado</p>
            <p className="font-bold text-background">R$ {(associate?.total_withdrawn || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-background/20 hover:bg-background/30 text-background border border-background/30 font-bold gap-2">
            <ArrowUpCircle size={16} /> Solicitar Saque
          </Button>
        </DialogTrigger>
          <DialogContent className="bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground font-black">Solicitar Saque</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <Label className="text-foreground">Valor (mín. R$ {config?.withdrawal_min_amount || 50})</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" type="number" step="0.01" placeholder="0.00" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} required />
              </div>
              <div>
                <Label className="text-foreground">Chave Pix</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" placeholder="CPF, e-mail, telefone ou chave aleatória" value={withdrawForm.pix_key} onChange={e => setWithdrawForm({...withdrawForm, pix_key: e.target.value})} />
              </div>
              <div>
                <Label className="text-foreground">Dados Bancários (opcional)</Label>
                <Input className="mt-1.5 bg-secondary border-border text-foreground" placeholder="Banco, agência, conta" value={withdrawForm.bank_info} onChange={e => setWithdrawForm({...withdrawForm, bank_info: e.target.value})} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full gold-gradient text-background font-bold">
                {submitting ? 'Enviando...' : 'Solicitar Saque'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Button
          onClick={() => setShowTransferModal(true)}
          className="bg-background/20 hover:bg-background/30 text-background border border-background/30 font-bold gap-2"
        >
          <ArrowRightLeft size={16} /> Transferir
        </Button>
        </div>
      </div>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <div className="dark-card rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-primary" /> Saques Solicitados
          </h3>
          <div className="space-y-3">
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">R$ {w.amount?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{w.pix_key || 'Pix'}</p>
                </div>
                <div className="text-right">
                  {statusBadge(w.status)}
                  {w.admin_notes && <p className="text-xs text-muted-foreground mt-1">{w.admin_notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer History */}
      {myTransfers.length > 0 && (
        <div className="dark-card rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-primary" /> Transferências Enviadas
          </h3>
          <div className="space-y-3">
            {myTransfers.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">Para: {t.to_associate_name}</p>
                  <p className="text-xs text-muted-foreground">{t.requested_at ? new Date(t.requested_at).toLocaleDateString('pt-BR') : ''}</p>
                  {t.notes && <p className="text-xs text-muted-foreground italic">"{t.notes}"</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-500">-R$ {t.amount?.toFixed(2)}</p>
                  {statusBadge(t.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission History */}
      <div className="dark-card rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <ArrowDownCircle size={16} className="text-green-400" /> Extrato de Comissões
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-secondary rounded animate-pulse" />)}
          </div>
        ) : commissions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma comissão registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {commissions.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.product_name}</p>
                  <p className="text-xs text-muted-foreground">Nível {c.network_level} · {c.originator_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+R$ {c.commission_amount?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{c.commission_percent}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showTransferModal && (
        <CommissionTransferModal
          associate={associate}
          onClose={() => setShowTransferModal(false)}
          onSubmitted={loadData}
        />
      )}
    </div>
  );
}