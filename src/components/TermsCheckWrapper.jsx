import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TermsAcceptanceFlow from './TermsAcceptanceFlow';

export default function TermsCheckWrapper({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [pendingTerms, setPendingTerms] = useState([]);
  const [checked, setChecked] = useState(false);
  const checkedUserIdRef = useRef(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    // Não verificar para admin
    if (isAuthenticated && user?.role === 'admin') {
      setChecked(true);
      return;
    }

    // Verificar apenas uma vez por usuário por sessão
    if (isAuthenticated && user && checkedUserIdRef.current !== user.id) {
      checkedUserIdRef.current = user.id;
      checkTermsStatus();
    }

    if (!isAuthenticated) {
      setChecked(false);
      setPendingTerms([]);
      checkedUserIdRef.current = null;
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  const checkTermsStatus = async () => {
    try {
      const response = await base44.functions.invoke('checkUserTermsStatus', { user_id: user.id });
      setPendingTerms(response.data?.pending_terms || []);
    } catch (error) {
      console.error('Erro ao verificar termos:', error);
      setPendingTerms([]);
    } finally {
      setChecked(true);
    }
  };

  const handleComplete = () => {
    setPendingTerms([]);
  };

  return (
    <>
      {children}
      {isAuthenticated && user && checked && pendingTerms.length > 0 && (
        <TermsAcceptanceFlow
          pendingTerms={pendingTerms}
          userId={user.id}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}