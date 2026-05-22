import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Clock, CheckCircle, XCircle, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const statusConfig = {
  pending:  { label: 'Pendente',  icon: Clock,        cls: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  approved: { label: 'Aprovado',  icon: CheckCircle,  cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  paid:     { label: 'Pago',      icon: DollarSign,   cls: 'bg-green-500/20 text-green-600 border-green-500/30' },
  rejected: { label: 'Rejeitado', icon: XCircle,      cls: 'bg-red-500/20 text-red-600 border-red-500/30' },
};

export default function MyWithdrawals() {
  const { associate } = useOutletContext();
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ amount: '', pix_key: '', bank_info: '' });
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (associate?.id) loadData();
  }, [associate]);

  const loadData = async () => {
    const [comms, withds, configs] = await Promise.all([
      base44.entities.Commission.filter({ beneficiary_id: associate.id }, '-created_date', 30),
      base44.entities.WithdrawalRequest.filter({ associate_id: associate.id }, '-created_date', 20),
      base44.entities.NetworkConfig.list(),
    ]);
    setCommissions(comms);
    setWithdrawals(withds);
    if (configs.length > 0) setConfig(configs[0]);
    setLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    const minAmount = config?.withdrawal_min_amount || 50;
    if (amount < minAmount) return alert(`Valor mínimo de saque: R$ ${minAmount.toFixed(2)}`);
    if (amount > (associate?.wallet_balance || 0)) return alert('Saldo insuficiente.');
    setSubmitting(true);
    await base44.entities.WithdrawalRequest.create({
      associate_id: associate.id,
      associate_name: associate.full_name,
      amount,
      pix_key: form.pix_key,
      bank_info: form.bank_info,
      status: 'pending',
    });
    setDialogOpen(false);
    setForm({ amount: '', pix_key: '', bank_info: '' });
    loadData();
    setSubmitting(false);
  };

  // Comissões do mês atual
  const now = new Date();
  const monthlyCommissions = commissions.filter(c => {
    const d = new Date(c.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyTotal = monthlyCommissions.reduce((s, c) => s + (c.commission_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Saques & Comissões</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seus ganhos e solicite saques</p>
      </div>

      {/* Card de saldo */}
      <div className="gold-gradient rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <p className="text-sm font-medium text-background/80 mb-1">Saldo Disponível para Saque</p>
        <p className="text-4xl font-black text-background">R$ {(associate?.wallet_balance || 0).toFixed(2)}</p>
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <p className="text-background/70">Total Ganho</p>
            <p className="font-bold text-background">R$ {(associate?.total_earned || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-background/70">Sacado</p>
            <p className="font-bold text-background">R$ {(associate?.total_withdrawn || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-background/70">Este Mês</p>
            <p className="font-bold text-background">R$ {monthlyTotal.toFixed(2)}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="mt-4 bg-background/20 hover:bg-background/30 text-background border border-background/30 font-bold gap-2"
              disabled={!associate?.wallet_balance || associate.wallet_balance <= 0}
            >
              <ArrowUpCircle size={16} /> Solicitar Saque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-black">Solicitar Saque</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <Label>Valor (mín. R$ {config?.withdrawal_min_amount || 50})</Label>
                <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
              </div>
              <div>
                <Label>Chave Pix</Label>
                <Input className="mt-1.5" placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={form.pix_key} onChange={e => setForm({...form, pix_key: e.target.value})} />
              </div>
              <div>
                <Label>Dados Bancários (opcional)</Label>
                <Input className="mt-1.5" placeholder="Banco, agência, conta"
                  value={form.bank_info} onChange={e => setForm({...form, bank_info: e.target.value})} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full gold-gradient text-background font-bold">
                {submitting ? 'Enviando...' : 'Solicitar Saque'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Comissões do Mês</p>
          <p className="text-2xl font-black text-green-600 mt-1">R$ {monthlyTotal.toFixed(2)}</p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Saques Pendentes</p>
          <p className="text-2xl font-black text-yellow-500 mt-1">
            {withdrawals.filter(w => w.status === 'pending').length}
          </p>
        </div>
        <div className="dark-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Comissões</p>
          <p className="text-2xl font-black text-foreground mt-1">{commissions.length}</p>
        </div>
      </div>

      {/* Histórico de Saques */}
      <div className="dark-card rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <ArrowUpCircle size={16} className="text-primary" /> Histórico de Saques
        </h3>
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}</div>
        ) : withdrawals.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">Nenhum saque solicitado ainda.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(w => {
              const s = statusConfig[w.status] || statusConfig.pending;
              const Icon = s.icon;
              return (
                <div key={w.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Wallet size={15} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">R$ {w.amount?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.pix_key || 'Pix'} · {new Date(w.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${s.cls} text-xs`}>
                      <Icon size={10} className="mr-1" />{s.label}
                    </Badge>
                    {w.admin_notes && <p className="text-xs text-muted-foreground mt-1">{w.admin_notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extrato de Comissões */}
      <div className="dark-card rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <ArrowDownCircle size={16} className="text-green-500" /> Extrato de Comissões
        </h3>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-secondary rounded animate-pulse" />)}</div>
        ) : commissions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma comissão registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {commissions.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Nível {c.network_level} · via {c.originator_name} · {new Date(c.created_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">+R$ {c.commission_amount?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{c.commission_percent}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}