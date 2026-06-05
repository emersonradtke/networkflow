import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Search, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CommissionTransferModal({ associate, onClose, onSubmitted }) {
  const [step, setStep] = useState('select'); // 'select' | 'confirm' | 'done'
  const [networkMembers, setNetworkMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNetwork();
  }, []);

  const loadNetwork = async () => {
    // Carregar todos os associados da rede do usuário (todos os níveis)
    const all = await base44.entities.Associate.filter({ status: 'active' });
    // Excluir o próprio associado
    setNetworkMembers(all.filter(a => a.id !== associate.id));
    setLoading(false);
  };

  const filtered = networkMembers.filter(m =>
    !search ||
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setStep('confirm');
    setError('');
  };

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Informe um valor válido.'); return; }
    if (val > (associate.wallet_balance || 0)) { setError('Saldo insuficiente para esta transferência.'); return; }
    if (val < 1) { setError('Valor mínimo de transferência: R$ 1,00.'); return; }

    setSubmitting(true);
    setError('');

    // Capturar IP via API pública (melhor esforço)
    let ip = '';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || '';
    } catch {}

    await base44.entities.CommissionTransfer.create({
      from_associate_id: associate.id,
      from_associate_name: associate.full_name,
      to_associate_id: selectedMember.id,
      to_associate_name: selectedMember.full_name,
      amount: val,
      from_balance_before: associate.wallet_balance || 0,
      from_balance_after: (associate.wallet_balance || 0) - val,
      to_balance_before: selectedMember.wallet_balance || 0,
      to_balance_after: (selectedMember.wallet_balance || 0) + val,
      notes,
      status: 'pending',
      ip_address: ip,
      user_agent: navigator.userAgent,
      requested_at: new Date().toISOString(),
    });

    setStep('done');
    setSubmitting(false);
    if (onSubmitted) onSubmitted();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-primary" /> Transferir Comissão
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o associado da rede para quem deseja transferir parte das suas comissões.
              A transferência ficará pendente até aprovação do administrador.
            </p>
            <div className="p-3 rounded-xl bg-secondary flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Seu saldo disponível</span>
              <span className="font-black text-primary">R$ {(associate.wallet_balance || 0).toFixed(2)}</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar associado..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Nenhum associado encontrado.</div>
              ) : filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMember(m)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-primary/30 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
                    {m.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'confirm' && selectedMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">De</p>
                <p className="text-sm font-bold text-foreground">{associate.full_name}</p>
                <p className="text-xs text-muted-foreground">Saldo: R$ {(associate.wallet_balance || 0).toFixed(2)}</p>
              </div>
              <ArrowRightLeft size={18} className="text-primary shrink-0" />
              <div className="flex-1 text-right">
                <p className="text-xs text-muted-foreground mb-1">Para</p>
                <p className="text-sm font-bold text-foreground">{selectedMember.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
              </div>
            </div>

            <div>
              <Label>Valor a Transferir (R$)</Label>
              <Input
                className="mt-1.5"
                type="number"
                step="0.01"
                min="1"
                placeholder="0,00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
              />
              {amount && parseFloat(amount) > 0 && (
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  <p>Seu saldo após: <span className="font-semibold text-foreground">R$ {((associate.wallet_balance || 0) - parseFloat(amount || 0)).toFixed(2)}</span></p>
                  <p>Saldo destino após: <span className="font-semibold text-foreground">R$ {((selectedMember.wallet_balance || 0) + parseFloat(amount || 0)).toFixed(2)}</span></p>
                </div>
              )}
            </div>

            <div>
              <Label>Observação (opcional)</Label>
              <Input
                className="mt-1.5"
                placeholder="Motivo ou comentário sobre a transferência"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              A transferência será analisada pelo administrador antes de ser efetivada. O valor será debitado somente após aprovação.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('select')}>Voltar</Button>
              <Button
                className="flex-1 text-white font-bold"
                style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }}
                onClick={handleSubmit}
                disabled={submitting || !amount}
              >
                {submitting ? 'Enviando...' : 'Solicitar Transferência'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h3 className="font-black text-foreground">Solicitação Enviada!</h3>
            <p className="text-sm text-muted-foreground">
              Sua solicitação de transferência de <strong>R$ {parseFloat(amount).toFixed(2)}</strong> para <strong>{selectedMember?.full_name}</strong> foi registrada e aguarda aprovação do administrador.
            </p>
            <Button className="w-full font-bold text-white" style={{ background: 'linear-gradient(90deg,#1B2A5E,#3B9EE2)' }} onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}