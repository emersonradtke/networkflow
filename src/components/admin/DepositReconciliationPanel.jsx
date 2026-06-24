import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronDown, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DepositReconciliationPanel() {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState([]);
  const [externalLinks, setExternalLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewDeposit, setShowNewDeposit] = useState(false);
  const [expandedDeposit, setExpandedDeposit] = useState(null);
  const [formData, setFormData] = useState({
    deposit_id: '',
    deposited_at: '',
    amount: '',
    bank_name: '',
    bank_code: '',
    agency: '',
    account: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deps, links] = await Promise.all([
        base44.entities.CommissionDeposit.list('-deposited_at', 100),
        base44.entities.ExternalLinkClick.filter({ status: { $in: ['submitted', 'approved'] } }, '-clicked_at', 100),
      ]);
      setDeposits(deps);
      setExternalLinks(links);
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeposit = async () => {
    if (!formData.deposit_id || !formData.deposited_at || !formData.amount) {
      toast({ variant: 'destructive', description: 'Preencha campos obrigatórios' });
      return;
    }
    try {
      await base44.entities.CommissionDeposit.create({
        ...formData,
        amount: parseFloat(formData.amount),
        reconciled_items: [],
        status: 'pending',
      });
      setFormData({
        deposit_id: '',
        deposited_at: '',
        amount: '',
        bank_name: '',
        bank_code: '',
        agency: '',
        account: '',
        notes: '',
      });
      setShowNewDeposit(false);
      await loadData();
      toast({ description: 'Depósito criado com sucesso' });
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao criar depósito' });
    }
  };

  const handleReconcile = async (depositId, linkId, reconcile = true) => {
    try {
      const deposit = deposits.find(d => d.id === depositId);
      let newItems = [...(deposit.reconciled_items || [])];
      if (reconcile && !newItems.includes(linkId)) {
        newItems.push(linkId);
      } else if (!reconcile) {
        newItems = newItems.filter(i => i !== linkId);
      }

      // Calcular novo status
      const totalApproved = externalLinks.filter(l => l.status === 'approved').length;
      const newStatus = newItems.length === 0 ? 'pending' : newItems.length === totalApproved ? 'complete' : 'partial';

      await base44.entities.CommissionDeposit.update(depositId, {
        reconciled_items: newItems,
        status: newStatus,
      });
      await loadData();
      toast({ description: reconcile ? 'Conciliação adicionada' : 'Conciliação removida' });
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao conciliar' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'partial': return 'bg-blue-100 text-blue-700';
      case 'complete': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Sem Conciliação';
      case 'partial': return 'Parcialmente Conciliado';
      case 'complete': return 'Totalmente Conciliado';
      default: return status;
    }
  };

  const approvedLinks = externalLinks.filter(l => l.status === 'approved');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Depósitos Recebidos</h2>
        <Button size="sm" onClick={() => setShowNewDeposit(true)} className="gap-1">
          <Plus size={14} /> Novo Depósito
        </Button>
      </div>

      {/* Nova Modal de Depósito */}
      <Dialog open={showNewDeposit} onOpenChange={setShowNewDeposit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Novo Depósito</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">ID do Depósito *</label>
              <Input
                placeholder="Ex: LOTE-001, NOTA-12345"
                value={formData.deposit_id}
                onChange={e => setFormData({ ...formData, deposit_id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Data e Hora *</label>
              <Input
                type="datetime-local"
                value={formData.deposited_at}
                onChange={e => setFormData({ ...formData, deposited_at: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Valor (R$) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nome do Banco</label>
                <Input
                  placeholder="Ex: Banco do Brasil"
                  value={formData.bank_name}
                  onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Código do Banco</label>
                <Input
                  placeholder="Ex: 001"
                  value={formData.bank_code}
                  onChange={e => setFormData({ ...formData, bank_code: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Agência</label>
                <Input
                  placeholder="Ex: 0001"
                  value={formData.agency}
                  onChange={e => setFormData({ ...formData, agency: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Conta</label>
                <Input
                  placeholder="Ex: 123456-7"
                  value={formData.account}
                  onChange={e => setFormData({ ...formData, account: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Observações</label>
              <Input
                placeholder="Notas adicionais"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewDeposit(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateDeposit} className="flex-1">
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lista de Depósitos */}
      <div className="space-y-2">
        {deposits.map(deposit => (
          <div key={deposit.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{deposit.deposit_id}</span>
                  <Badge className={`text-xs ${getStatusColor(deposit.status)}`}>
                    {getStatusLabel(deposit.status)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(deposit.deposited_at).toLocaleString('pt-BR')} · R$ {deposit.amount.toFixed(2)}
                </div>
                {deposit.bank_name && (
                  <div className="text-xs text-muted-foreground">
                    {deposit.bank_name} {deposit.agency && `· Ag: ${deposit.agency}`} {deposit.account && `· CC: ${deposit.account}`}
                  </div>
                )}
              </div>
              <button
                onClick={() => setExpandedDeposit(expandedDeposit === deposit.id ? null : deposit.id)}
                className="p-1 hover:bg-secondary rounded"
              >
                <ChevronDown size={16} className={`transition-transform ${expandedDeposit === deposit.id ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Intenções de Compra Aprovadas para Conciliação */}
            {expandedDeposit === deposit.id && (
              <div className="mt-3 pt-3 border-t space-y-1 max-h-64 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground">Intenções de Compra Aprovadas</p>
                {approvedLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma intenção aprovada disponível</p>
                ) : (
                  approvedLinks.map(link => {
                    const isReconciled = deposit.reconciled_items?.includes(link.id);
                    return (
                      <div
                        key={link.id}
                        className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${
                          isReconciled ? 'bg-green-50 border border-green-200' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => handleReconcile(deposit.id, link.id, !isReconciled)}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isReconciled ? 'bg-green-500 border-green-500' : 'border-slate-300'
                        }`}>
                          {isReconciled && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{link.product_name || link.banner_name}</div>
                          <div className="text-muted-foreground">
                            R$ {link.commission_amount?.toFixed(2) || '0.00'} · {link.associate_id?.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {deposits.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum depósito registrado ainda.
        </div>
      )}
    </div>
  );
}