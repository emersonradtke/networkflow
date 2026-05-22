import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function CommissionManager() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method: 'pix',
    details: '',
    notes: ''
  });
  const [filter, setFilter] = useState('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [filter]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const query = filter !== 'all' ? { status: filter } : {};
      const data = await base44.entities.Commission.filter(query);
      setCommissions(data);
    } catch (err) {
      console.error('Erro ao buscar comissões:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedCommission || !paymentForm.method || !paymentForm.details) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.CommissionPayment.create({
        commission_id: selectedCommission.id,
        beneficiary_id: selectedCommission.beneficiary_id,
        beneficiary_name: selectedCommission.beneficiary_name,
        amount: selectedCommission.commission_amount,
        payment_method: paymentForm.method,
        payment_details: paymentForm.details,
        notes: paymentForm.notes,
        status: 'completed'
      });

      await base44.entities.Commission.update(selectedCommission.id, { status: 'credited' });

      setPaymentModalOpen(false);
      setPaymentForm({ method: 'pix', details: '', notes: '' });
      setSelectedCommission(null);
      await fetchCommissions();
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      alert('Erro ao registrar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      credited: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: 'Pendente',
      credited: 'Pago',
      cancelled: 'Cancelado'
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin mr-2" />
        Carregando comissões...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          <Clock size={16} className="mr-2" />
          Pendentes
        </Button>
        <Button
          variant={filter === 'credited' ? 'default' : 'outline'}
          onClick={() => setFilter('credited')}
        >
          <CheckCircle size={16} className="mr-2" />
          Pagas
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todas
        </Button>
      </div>

      {/* Lista de comissões */}
      <div className="grid gap-4">
        {commissions.map(commission => (
          <Card key={commission.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Beneficiário</p>
                  <p className="font-semibold">{commission.beneficiary_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Produto</p>
                  <p className="font-semibold">{commission.product_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor da Comissão</p>
                  <p className="font-semibold text-lg">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(commission.commission_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nível da Rede</p>
                  <p className="font-semibold">Nível {commission.network_level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor do Pedido</p>
                  <p className="text-sm">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(commission.order_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(commission.status)}
                </div>
              </div>

              {commission.status === 'pending' && (
                <Button
                  onClick={() => {
                    setSelectedCommission(commission);
                    setPaymentModalOpen(true);
                  }}
                  className="w-full bg-primary"
                >
                  <DollarSign size={16} className="mr-2" />
                  Registrar Pagamento
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {commissions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma comissão encontrada</p>
        </div>
      )}

      {/* Modal de Pagamento */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento de Comissão</DialogTitle>
          </DialogHeader>

          {selectedCommission && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm"><strong>Beneficiário:</strong> {selectedCommission.beneficiary_name}</p>
                <p className="text-sm"><strong>Valor:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCommission.commission_amount)}</p>
              </div>

              <div>
                <Label>Método de Pagamento *</Label>
                <Select value={paymentForm.method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="wallet">Carteira</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Detalhes do Pagamento * {paymentForm.method === 'pix' && '(Chave PIX)'}</Label>
                <Input
                  placeholder={paymentForm.method === 'pix' ? 'Ex: abc123@pix' : 'Ex: Conta 12345-6'}
                  value={paymentForm.details}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, details: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Notas adicionais sobre o pagamento"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
                <Button onClick={handlePayment} disabled={submitting} className="bg-primary">
                  {submitting ? 'Registrando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}