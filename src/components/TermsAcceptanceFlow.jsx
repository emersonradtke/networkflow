import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { ScrollText, Shield, FileText, UserCheck, Image, BookOpen, FilePen, CheckCircle2, ChevronRight } from 'lucide-react';

const CATEGORY_META = {
  terms_of_service:  { label: 'Termos de Uso',              icon: ScrollText, color: 'bg-blue-100 text-blue-800' },
  privacy_policy:    { label: 'Política de Privacidade',    icon: Shield,     color: 'bg-purple-100 text-purple-800' },
  lgpd_consent:      { label: 'Consentimento LGPD',         icon: UserCheck,  color: 'bg-green-100 text-green-800' },
  image_consent:     { label: 'Uso de Imagem',              icon: Image,      color: 'bg-orange-100 text-orange-800' },
  regulation:        { label: 'Regulamento',                icon: BookOpen,   color: 'bg-red-100 text-red-800' },
  digital_contract:  { label: 'Contrato Digital',           icon: FilePen,    color: 'bg-yellow-100 text-yellow-800' },
  other:             { label: 'Documento',                  icon: FileText,   color: 'bg-gray-100 text-gray-800' },
};

function getCategoryMeta(term) {
  const cat = term.category || term.term_type || 'terms_of_service';
  return CATEGORY_META[cat] || CATEGORY_META.other;
}

// Tela: lista de documentos pendentes
function PendingList({ pendingTerms, onSelectTerm, acceptedIds }) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Documentos Pendentes</h2>
        <p className="text-sm text-muted-foreground">
          Leia e aceite todos os documentos abaixo para continuar usando o aplicativo.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {pendingTerms.map((term, index) => {
          const meta = getCategoryMeta(term);
          const Icon = meta.icon;
          const accepted = acceptedIds.has(term.id);

          return (
            <button
              key={term.id}
              onClick={() => !accepted && onSelectTerm(index)}
              disabled={accepted}
              className={`w-full text-left rounded-xl border p-4 flex items-center gap-4 transition-all ${
                accepted
                  ? 'bg-green-50 border-green-200 opacity-60 cursor-default'
                  : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                {accepted ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{term.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground">v{term.version || 1}</span>
                </div>
              </div>
              {accepted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        O acesso ao sistema ficará bloqueado até a conclusão de todos os aceites obrigatórios.
      </p>
    </div>
  );
}

// Tela: leitura e aceite de um documento
function DocumentReader({ term, onAccept, onBack, accepting, isLast, error }) {
  const [agreed, setAgreed] = useState(false);
  const meta = getCategoryMeta(term);
  const Icon = meta.icon;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground underline">
          ← Voltar
        </button>
        <div className="flex items-center gap-2 ml-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{term.title}</span>
          <Badge variant="outline" className="text-xs">v{term.version || 1}</Badge>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border rounded-xl p-4 bg-muted/30 min-h-0 mb-4">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{term.content}</ReactMarkdown>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-doc"
            checked={agreed}
            onCheckedChange={setAgreed}
            className="mt-0.5"
          />
          <Label htmlFor="agree-doc" className="cursor-pointer text-sm leading-snug">
            Li o conteúdo completo e concordo com <strong>{term.title}</strong> (Versão {term.version || 1}).
          </Label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        <Button
          onClick={() => onAccept(term)}
          disabled={accepting || !agreed}
          className="w-full font-semibold"
        >
          {accepting ? 'Registrando aceite...' : isLast ? 'Aceitar e Acessar o Sistema' : 'Aceitar e Ver Próximo'}
        </Button>
      </div>
    </div>
  );
}

// Componente principal
export default function TermsAcceptanceFlow({ pendingTerms, userId, userEmail, onComplete }) {
  const [view, setView] = useState('list'); // 'list' | 'document'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [accepting, setAccepting] = useState(false);

  const remaining = pendingTerms.filter(t => !acceptedIds.has(t.id));
  const currentTerm = pendingTerms[selectedIndex];

  const handleSelectTerm = (index) => {
    setSelectedIndex(index);
    setView('document');
  };

  const [acceptError, setAcceptError] = useState('');

  const handleAccept = async (term) => {
    setAccepting(true);
    setAcceptError('');
    try {
      await base44.functions.invoke('acceptTerms', {
        terms_id: term.id,
        terms_version: term.version || 1,
        user_id: userId,
        user_email: userEmail || '',
        terms_title: term.title || '',
        terms_category: term.category || ''
      });

      const newAccepted = new Set(acceptedIds);
      newAccepted.add(term.id);
      setAcceptedIds(newAccepted);

      // Verificar se ainda há pendentes
      const stillPending = pendingTerms.filter(t => !newAccepted.has(t.id));
      if (stillPending.length === 0) {
        onComplete();
        return;
      }

      // Ir para o próximo pendente ou volta para lista
      const nextPendingIndex = pendingTerms.findIndex(t => !newAccepted.has(t.id));
      if (nextPendingIndex >= 0) {
        setSelectedIndex(nextPendingIndex);
        if (stillPending.length > 1) {
          setView('list');
        }
      }
    } catch (error) {
      console.error('Erro ao aceitar termo:', error);
      setAcceptError('Erro ao registrar aceite. Tente novamente.');
    } finally {
      setAccepting(false);
    }
  };

  const isLastPending = remaining.filter(t => t.id !== currentTerm?.id).length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
        style={{ height: 'min(700px, 90vh)' }}>
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ScrollText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Termos e Documentos Obrigatórios</p>
                <p className="text-xs text-muted-foreground">
                  {remaining.length} de {pendingTerms.length} pendente{remaining.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {/* Progress */}
            <div className="flex items-center gap-1">
              {pendingTerms.map((t) => (
                <div
                  key={t.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    acceptedIds.has(t.id) ? 'bg-green-500' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 min-h-0">
          {view === 'list' ? (
            <PendingList
              pendingTerms={pendingTerms}
              onSelectTerm={handleSelectTerm}
              acceptedIds={acceptedIds}
            />
          ) : currentTerm ? (
            <DocumentReader
              term={currentTerm}
              onAccept={handleAccept}
              onBack={() => setView('list')}
              accepting={accepting}
              isLast={isLastPending}
              error={acceptError}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}