import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TermsAcceptanceFlow from './TermsAcceptanceFlow';

export default function TermsCheckWrapper({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [pendingTerms, setPendingTerms] = useState([]);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !isLoadingAuth && !checked) {
      checkTermsStatus();
    }
    if (!isAuthenticated && !isLoadingAuth) {
      setChecked(false);
      setPendingTerms([]);
    }
  }, [isAuthenticated, user, isLoadingAuth, checked]);

  const checkTermsStatus = async () => {
    setLoading(true);
    try {
      const userId = user.id;
      const response = await base44.functions.invoke('checkUserTermsStatus', { user_id: userId });
      setPendingTerms(response.data?.pending_terms || []);
    } catch (error) {
      console.error('Erro ao verificar termos:', error);
      setPendingTerms([]);
    } finally {
      setChecked(true);
      setLoading(false);
    }
  };

  const handleComplete = () => {
    setPendingTerms([]);
  };

  // Enquanto carrega a verificação, não bloquear (loading state do auth já cuida disso)
  if (loading || (isAuthenticated && user && !checked)) {
    return <>{children}</>;
  }

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