import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';

export default function TermsOfUse() {
  const navigate = useNavigate();
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await base44.functions.invoke('getTermsList', {});
        const all = response.data?.terms || [];
        const t = all.find(x => x.is_active && x.term_type === 'terms_of_service') || null;
        setTerm(t);
      } catch {
        setTerm(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAccept = async () => {
    if (!term) return;
    try {
      setAccepting(true);
      console.log(`[TERMS LOG] User accepted: ${term.title} (v${term.version || 1}) - Type: ${term.term_type} - Time: ${new Date().toISOString()}`);
      
      await base44.functions.invoke('acceptTerms', {
        terms_id: term.id,
        terms_version: term.version || 1
      });
      
      navigate(-1);
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <img src={LOGO_URL} alt="Bold Life" className="h-7 w-auto object-contain" />
        <h1 className="text-sm font-bold text-slate-800">Termos de Serviço</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : term ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-800">{term.title}</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">v{term.version}</span>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700">
              <ReactMarkdown>{term.content}</ReactMarkdown>
            </div>
            <div className="border-t pt-6 mt-8 flex justify-end">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="bg-primary hover:bg-primary/90"
              >
                {accepting ? 'Aceitando...' : 'Aceitar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-sm">
            Nenhum termo de serviço publicado ainda.
          </div>
        )}
      </div>
    </div>
  );
}