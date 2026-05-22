import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CreditCard, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BoldLifeCardSection({ associate, networkConfig, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spending, setSpending] = useState('');
  const [file, setFile] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const minSpending = networkConfig?.card_min_spending || 500;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande (máx 5MB)');
        return;
      }
      setFile(f);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !spending || !month) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (parseFloat(spending) < minSpending) {
      toast.error(`Valor mínimo é R$ ${minSpending.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.CardSpendingProof.create({
        associate_id: associate.id,
        associate_name: associate.full_name,
        month,
        spending_amount: parseFloat(spending),
        proof_url: uploadRes.file_url,
        status: 'pending'
      });

      toast.success('Comprovante enviado para análise!');
      setShowModal(false);
      setFile(null);
      setSpending('');
      setMonth(currentMonth);
      onUpdate?.();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao enviar comprovante');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCard = async (requestType) => {
    setLoading(true);
    try {
      await base44.entities.CardRequest.create({
        associate_id: associate.id,
        associate_name: associate.full_name,
        request_type: requestType,
        status: 'pending'
      });
      toast.success(requestType === 'new_request' ? 'Solicitação enviada! Admin irá orientar.' : 'Obrigado por informar! Admin será notificado.');
      setRequestSubmitted(true);
      onUpdate?.();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  if (!associate.has_boldlife_card) {
    if (requestSubmitted) {
      return (
        <div className="dark-card rounded-2xl p-5 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#10B98120' }}>
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Solicitação Enviada</h3>
              <p className="text-sm text-muted-foreground mt-1">Seu pedido foi registrado. O administrador irá entrar em contato em breve com as orientações.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="dark-card rounded-2xl p-5 border-l-4" style={{ borderLeftColor: '#3B9EE2' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#3B9EE220' }}>
              <CreditCard size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Cartão BoldLife</h3>
              <p className="text-sm text-muted-foreground mt-1">Você ainda não solicitou o cartão BoldLife. Escolha uma opção abaixo:</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => handleRequestCard('new_request')}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 font-bold"
          >
            {loading ? 'Enviando...' : 'Solicitar Cartão'}
          </Button>
          <Button
            onClick={() => handleRequestCard('already_has')}
            disabled={loading}
            variant="outline"
            className="flex-1 font-bold"
          >
            {loading ? 'Enviando...' : 'Já Possuo Cartão'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="dark-card rounded-2xl p-5 border-l-4" style={{ borderLeftColor: '#10B981' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#10B98120' }}>
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Cartão BoldLife Ativo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você possui o cartão BoldLife. Compartilhe seus gastos para ativar benefícios mensais.
              </p>
              {associate.card_activation_month && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ativado desde: {new Date(associate.card_activation_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary/90 font-bold gap-2 shrink-0"
          >
            <Upload size={16} />
            Enviar Comprovante
          </Button>
        </div>
      </div>

      {showModal && (
        <div className="dark-card rounded-2xl p-6 border-2 border-primary/20">
          <h4 className="font-bold text-foreground mb-4">Enviar Comprovante de Gasto</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Mês de Referência</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                Valor Gasto (mínimo R$ {minSpending.toFixed(2)})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={spending}
                  onChange={(e) => setSpending(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                Comprovante de Gasto
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="proof-file"
                  required
                />
                <label htmlFor="proof-file" className="cursor-pointer block">
                  {file ? (
                    <p className="text-sm text-primary font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste uma imagem/PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">Máx 5MB</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {loading ? 'Enviando...' : 'Enviar Comprovante'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}