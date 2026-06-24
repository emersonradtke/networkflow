import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, FileText, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseProofModal({ clickId, isOpen, onClose, productName, onSubmitted }) {
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [files, setFiles] = useState([]); // [{file, preview, name}]
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const newFiles = selected.map(file => ({
      file,
      name: file.name,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      isPdf: file.type === 'application/pdf'
    }));
    setFiles(prev => [...prev, ...newFiles]);
    // Reset input so same file can be re-added if needed
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

  const handleClose = () => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setPurchaseAmount('');
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!purchaseAmount || files.length === 0) {
      toast.error('Preencha o valor e anexe pelo menos um comprovante');
      return;
    }

    setLoading(true);
    try {
      // Faz upload de todos os arquivos em paralelo
      const uploadResults = await Promise.all(
        files.map(({ file }) => base44.integrations.Core.UploadFile({ file }))
      );
      const proofUrls = uploadResults.map(r => r.file_url);

      await base44.functions.invoke('submitPurchaseProof', {
        click_id: clickId,
        purchase_proof_urls: proofUrls,
        purchase_amount: parseFloat(purchaseAmount)
      });

      setSuccess(true);
      setTimeout(() => {
        onSubmitted?.();
        handleClose();
      }, 2000);
    } catch (e) {
      console.error('submitPurchaseProof error:', e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Erro ao enviar comprovante';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar Compra</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-10">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-2">Comprovante(s) Enviado(s)!</h3>
            <p className="text-sm text-muted-foreground">Aguarde a confirmação do administrador.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Produto</p>
              <p className="text-sm font-medium text-foreground">{productName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Valor Total da Compra (R$) *</label>
              <Input
                type="number"
                placeholder="0.00"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                step="0.01"
                min="0"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Comprovantes * ({files.length} anexado{files.length !== 1 ? 's' : ''})
              </label>

              {/* Lista de arquivos já adicionados */}
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-secondary rounded-lg border border-border">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-primary" />
                        </div>
                      )}
                      <p className="text-xs text-foreground truncate flex-1">{f.name}</p>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão para adicionar mais */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-secondary/50 transition"
              >
                <Plus size={20} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {files.length === 0 ? 'Clique para adicionar comprovante(s)' : 'Adicionar mais comprovantes'}
                </p>
                <p className="text-xs text-muted-foreground">Imagens ou PDF</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={loading || files.length === 0 || !purchaseAmount} className="flex-1">
                {loading ? 'Enviando...' : `Enviar ${files.length > 1 ? `${files.length} Comprovantes` : 'Comprovante'}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}