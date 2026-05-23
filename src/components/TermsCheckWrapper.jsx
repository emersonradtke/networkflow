import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TermsOfServiceModal from './TermsOfServiceModal';

export default function TermsCheckWrapper({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsLoaded, setTermsLoaded] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !isLoadingAuth && !termsLoaded) {
      checkTermsStatus();
    }
  }, [isAuthenticated, user, isLoadingAuth, termsLoaded]);

  const checkTermsStatus = async () => {
    try {
      const response = await base44.functions.invoke('checkUserTermsStatus', { user_id: user.id });
      // Se houver termos ativos e o usuário não aceitou esta versão, mostra modal
      if (response.data?.needs_acceptance) {
        setShowTermsModal(true);
      } else {
        setShowTermsModal(false);
      }
      setTermsLoaded(true);
    } catch (error) {
      console.error('Erro ao verificar termos:', error);
      setTermsLoaded(true);
    }
  };

  const handleAcceptTerms = () => {
    setShowTermsModal(false);
    setTermsLoaded(true); // Mantém como carregado - todos os termos já foram aceitos
  };

  return (
    <>
      {children}
      {user && (
        <TermsOfServiceModal
          open={showTermsModal}
          onAccept={handleAcceptTerms}
          user={user}
        />
      )}
    </>
  );
}