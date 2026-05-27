import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TermsOfServiceModal from './TermsOfServiceModal';

export default function TermsCheckWrapper({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !isLoadingAuth && !checked) {
      checkTermsStatus();
    }
    // Se deslogar, resetar para checar novamente no próximo login
    if (!isAuthenticated && !isLoadingAuth) {
      setChecked(false);
      setShowTermsModal(false);
    }
  }, [isAuthenticated, user, isLoadingAuth, checked]);

  const checkTermsStatus = async () => {
    try {
      // Usa o id do usuário (Base44 nativo ou DirectUser)
      const userId = user.id;
      const response = await base44.functions.invoke('checkUserTermsStatus', { user_id: userId });
      if (response.data?.needs_acceptance) {
        setShowTermsModal(true);
      }
    } catch (error) {
      console.error('Erro ao verificar termos:', error);
    } finally {
      setChecked(true);
    }
  };

  const handleAcceptTerms = () => {
    setShowTermsModal(false);
  };

  return (
    <>
      {children}
      {user && showTermsModal && (
        <TermsOfServiceModal
          open={showTermsModal}
          onAccept={handleAcceptTerms}
          user={user}
        />
      )}
    </>
  );
}