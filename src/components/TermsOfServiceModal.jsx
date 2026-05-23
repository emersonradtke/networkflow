import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import { AlertCircle } from 'lucide-react';

export default function TermsOfServiceModal({ open, onAccept, user }) {
  const [pendingTerms, setPendingTerms] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPendingTerms();
    }
  }, [open]);

  const fetchPendingTerms = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('checkUserTermsStatus', { user_id: user.id });
      const pending = response.data?.pending_terms || [];
      setPendingTerms(pending);
      setCurrentIndex(0);
      setAgreed(false);
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTerm = pendingTerms[currentIndex];

  const handleAcceptCurrent = async () => {
    if (!currentTerm) return;

    try {
      setAccepting(true);
      console.log(`[TERMS LOG] User accepted: ${currentTerm.title} (v${currentTerm.version || 1}) - Type: ${currentTerm.term_type} - Time: ${new Date().toISOString()}`);
      
      await base44.functions.invoke('acceptTerms', {
        terms_id: currentTerm.id,
        terms_version: currentTerm.version || 1
      });

      const nextIndex = currentIndex + 1;
      if (nextIndex < pendingTerms.length) {
        setCurrentIndex(nextIndex);
        setAgreed(false);
      } else {
        onAccept();
      }
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
    } finally {
      setAccepting(false);
    }
  };

  const typeLabel = (type) => type === 'privacy_policy' ? 'Política de Privacidade' : 'Termos de Serviço';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onAccept();
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {currentTerm?.title || 'Termos de Serviço'}
          </DialogTitle>
          <DialogDescription>
            {currentTerm ? `${typeLabel(currentTerm.term_type)} — Versão ${currentTerm.version || 1}` : ''}
            {pendingTerms.length > 1 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({currentIndex + 1} de {pendingTerms.length})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentTerm ? (
          <div className="flex-1 overflow-y-auto">
            <div className="prose prose-sm max-w-none mb-6">
              <ReactMarkdown>{currentTerm.content}</ReactMarkdown>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree-terms"
                  checked={agreed}
                  onCheckedChange={setAgreed}
                  className="mt-1"
                />
                <Label htmlFor="agree-terms" className="cursor-pointer text-sm">
                  Li e concordo com {currentTerm.term_type === 'privacy_policy' ? 'a Política de Privacidade' : 'os Termos de Serviço'} acima
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700">Nenhum termo pendente encontrado.</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button
            onClick={handleAcceptCurrent}
            disabled={accepting || !currentTerm}
            className="bg-primary hover:bg-primary/90"
          >
            {accepting ? 'Aceitando...' : (
              currentIndex + 1 < pendingTerms.length ? 'Aceitar e Continuar' : 'Aceitar e Entrar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}