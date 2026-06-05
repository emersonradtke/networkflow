import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-utils';
import { Wallet, TrendingUp, Users, Gift, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react';

const statusConfig = {
  pending:  { label: 'Pendente',  cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado',  cls: 'bg-blue-100 text-blue-700' },
  paid:     { label: 'Pago',      cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-100 text-red-700' },
  active:   { label: 'Ativo',     cls: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inativo',   cls: 'bg-slate-100 text-slate-600' },
  blocked:  { label: 'Bloqueado', cls: 'bg-red-100 text-red-700' },
  credited: { label: 'Creditado', cls: 'bg-green-100 text-green-700' },
  cancelled:{ label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{text}</p>;
}

// ── Saldo ──────────────────────────────────────────────────────────────────────
function SaldoDetail({ associate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [commissions, withdrawals, transfersIn, transfersOut] = await Promise.all([
        base44.entities.Commission.filter({ beneficiary_id: associate.id, status: 'credited' }, '-created_date', 50),
        base44.entities.WithdrawalRequest.filter({ associate_id: associate.id }, '-created_date', 50),
        base44.entities.CommissionTransfer.filter({ to_associate_id: associate.id, status: 'approved' }, '-created_date', 50),
        base44.entities.CommissionTransfer.filter({ from_associate_id: associate.id, status: 'approved' }, '-created_date', 50),
      ]);

      const all = [
        ...commissions.map(c => ({
          id: 'c-' + c.id,
          date: c.created_date,
          type: 'entrada',
          label: `Comissão — ${c.product_name || 'Produto'}`,
          sublabel: `Nível ${c.network_level ?? '-'} · ${c.originator_name || ''}`,
          amount: c.commission_amount || 0,
        })),
        ...withdrawals.map(w => ({
          id: 'w-' + w.id,
          date: w.created_date,
          type: w.status === 'rejected' ? 'cancelado' : 'saida',
          label: 'Saque solicitado',
          sublabel: w.status === 'rejected' ? 'Rejeitado' : w.status === 'approved' ? 'Aprovado' : 'Pendente',
          amount: w.amount || 0,
          status: w.status,
        })),
        ...transfersIn.map(t => ({
          id: 'ti-' + t.id,
          date: t.created_date,
          type: 'entrada',
          label: `Transferência recebida`,
          sublabel: `De: ${t.from_associate_name || ''}`,
          amount: t.amount || 0,
        })),
        ...transfersOut.map(t => ({
          id: 'to-' + t.id,
          date: t.created_date,
          type: 'saida',
          label: `Transferência enviada`,
          sublabel: `Para: ${t.to_associate_name || ''}`,
          amount: t.amount || 0,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setEntries(all);
      setLoading(false);
    };
    load();
  }, [associate.id]);

  const totalEntradas = entries.filter(e => e.type === 'entrada').reduce((s, e) => s + e.amount, 0);
  const totalSaidas   = entries.filter(e => e.type === 'saida').reduce((s, e) => s + e.amount, 0);

  const iconMap = {
    entrada:   <ArrowDownCircle size={16} className="text-green-500 shrink-0" />,
    saida:     <ArrowUpCircle size={16} className="text-red-400 shrink-0" />,
    cancelado: <ArrowUpCircle size={16} className="text-slate-300 shrink-0" />,
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
          <p className="text-base font-black text-primary">R$ {(associate.wallet_balance || 0).toFixed(2)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Entradas</p>
          <p className="text-base font-black text-green-600">R$ {totalEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Saídas</p>
          <p className="text-base font-black text-red-500">R$ {totalSaidas.toFixed(2)}</p>
        </div>
      </div>

      {/* Extrato */}
      <Section title="Extrato de movimentações">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState text="Nenhuma movimentação encontrada." />
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: e.type === 'entrada' ? 'rgba(34,197,94,0.1)' : e.type === 'cancelado' ? 'rgba(100,116,139,0.08)' : 'rgba(239,68,68,0.08)' }}>
                  {iconMap[e.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.sublabel} · {formatDate(e.date)}</p>
                </div>
                <p className={`text-sm font-black shrink-0 ${e.type === 'entrada' ? 'text-green-600' : e.type === 'cancelado' ? 'text-slate-400 line-through' : 'text-red-500'}`}>
                  {e.type === 'entrada' ? '+' : '-'}R$ {e.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Total Ganho ────────────────────────────────────────────────────────────────
function TotalGanhoDetail({ associate }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Commission.filter({ beneficiary_id: associate.id }, '-created_date', 30)
      .then(r => { setCommissions(r); setLoading(false); });
  }, [associate.id]);

  const totalCredited = commissions.filter(c => c.status === 'credited').reduce((s, c) => s + (c.commission_amount || 0), 0);
  const totalPending  = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.commission_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Creditado</p>
          <p className="text-base font-black text-green-600">R$ {totalCredited.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pendente</p>
          <p className="text-base font-black text-yellow-600">R$ {totalPending.toFixed(2)}</p>
        </div>
      </div>

      <Section title="Histórico de Comissões (últimas 30)">
        {loading ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> :
         commissions.length === 0 ? <EmptyState text="Nenhuma comissão registrada." /> : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {commissions.map(c => {
              const s = statusConfig[c.status] || statusConfig.pending;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.product_name}</p>
                    <p className="text-xs text-muted-foreground">Nível {c.network_level} · {c.originator_name} · {formatDate(c.created_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+R$ {c.commission_amount?.toFixed(2)}</p>
                    <Badge className={`${s.cls} text-xs mt-0.5`}>{s.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Diretos ────────────────────────────────────────────────────────────────────
function DiretosDetail({ associate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Associate.filter({ sponsor_id: associate.id }, '-created_date')
      .then(r => { setMembers(r); setLoading(false); });
  }, [associate.id]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: members.length,                                        color: 'text-primary' },
          { label: 'Ativos',   value: members.filter(m => m.status === 'active').length,     color: 'text-green-600' },
          { label: 'Pendentes',value: members.filter(m => m.status === 'pending').length,    color: 'text-yellow-600' },
        ].map(i => (
          <div key={i.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{i.label}</p>
            <p className={`text-xl font-black ${i.color}`}>{loading ? '...' : i.value}</p>
          </div>
        ))}
      </div>

      <Section title="Membros Diretos">
        {loading ? <div className="h-10 bg-slate-100 rounded animate-pulse" /> :
         members.length === 0 ? <EmptyState text="Nenhum membro direto ainda. Compartilhe seu link!" /> : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map(m => {
              const s = statusConfig[m.status] || { label: m.status, cls: 'bg-slate-100 text-slate-600' };
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                    {m.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.created_date)}</p>
                  </div>
                  <Badge className={s.cls}>{s.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Pontos ─────────────────────────────────────────────────────────────────────
function PontosDetail({ associate }) {
  const [orders, setOrders] = useState([]);
  const [cardProofs, setCardProofs] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.filter({ associate_id: associate.id, status: 'paid' }, '-created_date', 50),
      base44.entities.CardSpendingProof.filter({ associate_id: associate.id, status: 'approved' }, '-created_date', 50),
      base44.entities.NetworkConfig.list(),
    ]).then(([ord, proofs, cfg]) => {
      setOrders(ord);
      setCardProofs(proofs);
      setConfig(cfg[0] || null);
      setLoading(false);
    });
  }, [associate.id]);

  const pontosPerReal = config?.pontos_por_real || 1;

  // Build unified list of point sources
  const sources = [
    ...orders.map(o => ({
      id: 'o-' + o.id,
      date: o.created_date,
      label: `Compra — ${o.product_name || 'Produto'}`,
      sublabel: `Pedido #${o.order_number || o.id.slice(0,6)} · R$ ${(o.amount || 0).toFixed(2)}`,
      pontos: Math.floor((o.amount || 0) * pontosPerReal),
    })),
    ...cardProofs.map(p => ({
      id: 'cp-' + p.id,
      date: p.created_date,
      label: `Gasto no Cartão BoldLife`,
      sublabel: `Ref. ${p.month} · R$ ${(p.spending_amount || 0).toFixed(2)}`,
      pontos: Math.floor((p.spending_amount || 0) * pontosPerReal),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-2xl p-4 text-center">
        <Gift size={28} className="text-purple-500 mx-auto mb-1" />
        <p className="text-3xl font-black text-purple-700">{(associate.total_pontos || 0).toLocaleString('pt-BR')}</p>
        <p className="text-sm text-muted-foreground mt-1">Pontos acumulados</p>
        {config && (
          <p className="text-xs text-purple-400 mt-1">{pontosPerReal} ponto{pontosPerReal !== 1 ? 's' : ''} a cada R$ 1,00 gasto</p>
        )}
      </div>

      <Section title="Origem dos pontos">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : sources.length === 0 ? (
          <EmptyState text="Nenhum ponto registrado ainda. Realize compras na loja!" />
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {sources.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(168,85,247,0.1)' }}>
                  <Gift size={14} className="text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.sublabel} · {formatDate(s.date)}</p>
                </div>
                <p className="text-sm font-black text-purple-600 shrink-0">+{s.pontos.toLocaleString('pt-BR')} pts</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Modal principal ────────────────────────────────────────────────────────────
const modalConfig = {
  saldo:       { title: 'Detalhes do Saldo',        icon: Wallet,     component: SaldoDetail },
  totalGanho:  { title: 'Detalhes dos Ganhos',       icon: TrendingUp, component: TotalGanhoDetail },
  diretos:     { title: 'Membros Diretos',           icon: Users,      component: DiretosDetail },
  pontos:      { title: 'Detalhes dos Pontos',       icon: Gift,       component: PontosDetail },
};

export default function DashboardStatModal({ type, associate, onClose }) {
  if (!type || !associate) return null;
  const cfg = modalConfig[type];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const Detail = cfg.component;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <Icon size={18} className="text-primary" /> {cfg.title}
          </DialogTitle>
        </DialogHeader>
        <Detail associate={associate} />
      </DialogContent>
    </Dialog>
  );
}