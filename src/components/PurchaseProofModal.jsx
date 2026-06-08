import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';

export default function PurchaseProofModal({ clickId, isOpen, onClose, productName, onSubmitted }) {
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setProofPreview(ev.target.result);
        reader.readAsDataURL(file);
      } else {
        // PDF ou outro — apenas marca que tem arquivo
        setProofPreview('non-image');
      }
    }
  };

  const handleSubmit = async () => {
    if (!purchaseAmount || !proofFile) {
      setError('Preencha o valor e anexe o comprovante');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload do comprovante
      const uploadRes = await base44.integrations.Core.UploadFile({ file: proofFile });
      const proofUrl = uploadRes.file_url;

      // Submeter compra
      await base44.functions.invoke('submitPurchaseProof', {
        click_id: clickId,
        purchase_proof_url: proofUrl,
        purchase_amount: parseFloat(purchaseAmount)
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSubmitted?.();
        setPurchaseAmount('');
        setProofFile(null);
        setProofPreview('');
        setSuccess(false);
      }, 2000);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Erro ao enviar comprovante. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Compra</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#1B2A5E,#3B9EE2)' }}>
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="font-bold text-foreground mb-2">Comprovante Enviado!</h3>
            <p className="text-sm text-muted-foreground">Seu comprovante foi recebido. Aguarde a confirmação do admin.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Produto</label>
              <p className="text-sm text-muted-foreground mt-1">{productName}</p>
            </div>

            <div>
              <label htmlFor="amount" className="text-sm font-medium text-foreground">Valor da Compra (R$) *</label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Comprovante de Compra *</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                {proofPreview ? (
                  <div className="space-y-3">
                    {proofPreview === 'non-image' ? (
                      <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                        <Upload size={20} className="text-primary shrink-0" />
                        <p className="text-sm font-medium text-foreground truncate">{proofFile?.name}</p>
                      </div>
                    ) : (
                      <img src={proofPreview} alt="Preview" className="w-full rounded" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById('proof-file').click()}
                    >
                      Trocar Arquivo
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => document.getElementById('proof-file').click()}
                    className="w-full text-center py-6 hover:bg-secondary rounded transition"
                  >
                    <Upload size={24} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para enviar</p>
                  </button>
                )}
                <input
                  id="proof-file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Enviando...' : 'Enviar Comprovante'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}