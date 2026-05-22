import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ReactMarkdown from 'react-markdown';
import { AlertCircle } from 'lucide-react';

export default function TermsOfServiceModal({ open, onAccept, user }) {
  const [terms, setTerms] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchActiveTerms();
    }
  }, [open]);

  const fetchActiveTerms = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('checkUserTermsStatus', {});
      if (response.data?.current_terms) {
        setTerms(response.data.current_terms);
        setAgreed(false);
      }
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!agreed || !terms) return;

    try {
      setAccepting(true);
      
      // Registrar aceite do termo
      await base44.functions.invoke('acceptTerms', {
        terms_id: terms.id,
        terms_version: terms.version || 1
      });

      setAgreed(false);
      onAccept();
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && null}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{terms?.title || 'Termos de Serviço'}</DialogTitle>
          <DialogDescription>
            Versão {terms?.version || 1}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : terms ? (
          <div className="flex-1 overflow-y-auto">
            <div className="prose prose-sm max-w-none mb-6">
              <ReactMarkdown>
                {terms.content}
              </ReactMarkdown>
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
                  Concordo com os termos de serviço acima
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700">Nenhum termo de serviço ativo encontrado.</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onAccept()}
            disabled={accepting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!agreed || accepting || !terms}
            className="bg-primary hover:bg-primary/90"
          >
            {accepting ? 'Aceitando...' : 'Aceitar Termos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}