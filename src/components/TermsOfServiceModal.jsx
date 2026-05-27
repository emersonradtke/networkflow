import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import { ScrollText, Shield } from 'lucide-react';

export default function TermsOfServiceModal({ open, onAccept, user }) {
  const [pendingTerms, setPendingTerms] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchPendingTerms();
    }
  }, [open, user]);

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
  const isLast = currentIndex + 1 >= pendingTerms.length;
  const typeLabel = (type) => type === 'privacy_policy' ? 'Política de Privacidade' : 'Termos de Serviço';
  const TypeIcon = currentTerm?.term_type === 'privacy_policy' ? Shield : ScrollText;

  const handleAcceptCurrent = async () => {
    if (!currentTerm) return;

    try {
      setAccepting(true);
      await base44.functions.invoke('acceptTerms', {
        terms_id: currentTerm.id,
        terms_version: currentTerm.version || 1
      });

      if (!isLast) {
        setCurrentIndex(currentIndex + 1);
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

  return (
    // onOpenChange intencional sem handler: modal não pode ser fechado sem aceitar
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col"
        // Remove o X de fechar do Radix UI
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className="w-5 h-5 text-primary" />
            <DialogTitle>
              {currentTerm?.title || 'Termos de Serviço'}
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2">
            {currentTerm ? `${typeLabel(currentTerm.term_type)} — Versão ${currentTerm.version || 1}` : ''}
            {pendingTerms.length > 1 && (
              <span className="ml-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {currentIndex + 1} de {pendingTerms.length}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentTerm ? (
          <>
            <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/30 min-h-0">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{currentTerm.content}</ReactMarkdown>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree-terms"
                  checked={agreed}
                  onCheckedChange={setAgreed}
                  className="mt-0.5"
                />
                <Label htmlFor="agree-terms" className="cursor-pointer text-sm leading-snug">
                  Li e concordo com {currentTerm.term_type === 'privacy_policy' ? 'a Política de Privacidade' : 'os Termos de Serviço'} acima
                </Label>
              </div>

              <Button
                onClick={handleAcceptCurrent}
                disabled={accepting || !agreed}
                className="w-full font-semibold"
              >
                {accepting ? 'Salvando...' : isLast ? 'Aceitar e Continuar' : 'Aceitar e Ver Próximo'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                É necessário aceitar todos os termos para utilizar o aplicativo.
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Nenhum termo pendente.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}