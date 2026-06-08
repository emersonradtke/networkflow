import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CreditCard, Upload, CheckCircle, Plus, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

export default function BoldLifeCardSection({ associate, networkConfig, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spending, setSpending] = useState('');
  const [files, setFiles] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [requestLoading, setRequestLoading] = useState(false);
  // Estado local independente do prop — persiste até que associate seja recarregado
  const [hasCardLocal, setHasCardLocal] = useState(!!associate?.has_boldlife_card);
  const fileInputRef = useRef(null);

  // Só atualiza hasCardLocal quando associate mudar E tiver dado concreto
  useEffect(() => {
    if (associate?.id) {
      setHasCardLocal(!!associate.has_boldlife_card);
    }
  }, [associate?.id, associate?.has_boldlife_card]);

  const minSpending = networkConfig?.card_min_spending || 500;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const newFiles = selected.map(f => ({
      file: f,
      name: f.name,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    }));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleRequestCard = async () => {
    setRequestLoading(true);
    try {
      await base44.entities.CardRequest.create({
        associate_id: associate.id,
        associate_name: associate.full_name,
        status: 'pending'
      });
      toast.success('Solicitação enviada! O administrador entrará em contato em breve.');
    } catch (err) {
      toast.error('Erro ao solicitar cartão: ' + (err?.message || ''));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleAlreadyHaveCard = async () => {
    setRequestLoading(true);
    try {
      await base44.entities.Associate.update(associate.id, {
        has_boldlife_card: true,
        card_activation_month: new Date().toISOString().slice(0, 7)
      });
      // Atualiza local imediatamente antes do reload
      setHasCardLocal(true);
      toast.success('Cartão registrado com sucesso!');
      onUpdate?.();
    } catch (err) {
      toast.error('Erro ao registrar cartão: ' + (err?.message || ''));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRemoveCard = async () => {
    setRequestLoading(true);
    try {
      await base44.entities.Associate.update(associate.id, {
        has_boldlife_card: false,
        card_activation_month: null
      });
      setHasCardLocal(false);
      toast.success('Cartão removido com sucesso!');
      onUpdate?.();
    } catch (err) {
      toast.error('Erro ao remover cartão: ' + (err?.message || ''));
    } finally {
      setRequestLoading(false);
    }
  };

  const resetForm = () => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setSpending('');
    setMonth(new Date().toISOString().slice(0, 7));
    setShowModal(false);
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !spending || !month) {
      toast.error('Preencha todos os campos e anexe pelo menos um comprovante');
      return;
    }
    if (parseFloat(spending) < minSpending) {
      toast.error(`Valor mínimo é R$ ${minSpending.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const uploadResults = await Promise.all(
        files.map(({ file }) => base44.integrations.Core.UploadFile({ file }))
      );
      const proofUrls = uploadResults.map(r => r.file_url);

      await base44.entities.CardSpendingProof.create({
        associate_id: associate.id,
        month,
        spending_amount: parseFloat(spending),
        proof_url: proofUrls[0],
        status: 'pending'
      });

      toast.success('Comprovante(s) enviado(s) para análise!');
      resetForm();
      onUpdate?.();
    } catch (err) {
      toast.error('Erro ao enviar: ' + (err?.response?.data?.error || err?.message || 'tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  if (!hasCardLocal) {
    return (
      <div className="dark-card rounded-2xl p-5 border-l-4" style={{ borderLeftColor: '#3B9EE2' }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#3B9EE220' }}>
              <CreditCard size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Cartão BoldLife</h3>
              <p className="text-sm text-muted-foreground mt-1">Você ainda não solicitou o cartão BoldLife</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleRequestCard}
              disabled={requestLoading}
              className="bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              <Plus size={16} />
              Solicitar
            </Button>
            <Button
              onClick={handleAlreadyHaveCard}
              disabled={requestLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {requestLoading ? 'Salvando...' : 'Já Tenho'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="dark-card rounded-2xl p-5 border-l-4" style={{ borderLeftColor: '#10B981' }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#10B98120' }}>
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Cartão BoldLife Ativo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Compartilhe seus gastos mensais para ativar benefícios.
              </p>
              {associate?.card_activation_month && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ativado desde: {new Date(associate.card_activation_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 items-center">
            <Button
              onClick={() => setShowModal(true)}
              className="bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              <Upload size={16} />
              Enviar Comprovante
            </Button>
            <Button
              onClick={handleRemoveCard}
              disabled={requestLoading}
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Não Tenho
            </Button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="dark-card rounded-2xl p-6 border-2 border-primary/20">
          <h4 className="font-bold text-foreground mb-4">Enviar Comprovante de Gasto</h4>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Mês de Referência</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                Valor Gasto (mínimo R$ {minSpending.toFixed(2)})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={spending}
                  onChange={(e) => setSpending(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Comprovantes ({files.length} anexado{files.length !== 1 ? 's' : ''})
              </label>

              {/* Lista de arquivos */}
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-secondary rounded-lg border border-border">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-primary" />
                        </div>
                      )}
                      <p className="text-xs text-foreground truncate flex-1">{f.name}</p>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Área de upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 hover:bg-secondary/50 transition"
              >
                <Upload size={20} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {files.length === 0 ? 'Clique para adicionar arquivo(s)' : 'Adicionar mais arquivos'}
                </p>
                <p className="text-xs text-muted-foreground">Imagem, PDF ou qualquer formato</p>
              </button>
              {/* Sem restrict de accept para aceitar qualquer arquivo */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={loading || files.length === 0 || !spending}
                onClick={handleSubmit}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {loading ? 'Enviando...' : `Enviar ${files.length > 1 ? `${files.length} Arquivos` : 'Comprovante'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}