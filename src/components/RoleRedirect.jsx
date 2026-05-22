import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleRedirect() {
  const navigate = useNavigate();
  const { user, isLoadingAuth, role, associate } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && user && role) {
      // Redirecionar baseado no role
      if (role.name === 'admin') {
        navigate('/admin', { replace: true });
      } else if (associate) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, isLoadingAuth, role, associate, navigate]);

  return null;
}