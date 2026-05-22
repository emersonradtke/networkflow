import { useAuth } from '@/lib/AuthContext';
import { hasPermission, canAccessPath } from '@/lib/roles-config';
import { AlertCircle } from 'lucide-react';

export function RoleGate({ children, requiredRole = null, requiredPermission = null, fallback = null }) {
  const { user } = useAuth();

  if (!user) return fallback || <AccessDenied reason="Não autenticado" />;

  const userRole = user.role || 'guest';

  // Verificar role específica
  if (requiredRole && userRole !== requiredRole) {
    return fallback || <AccessDenied reason={`Acesso restrito a ${requiredRole}`} />;
  }

  // Verificar permissão
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return fallback || <AccessDenied reason={`Você não tem permissão para isso`} />;
  }

  return children;
}

export function AccessDenied({ reason = 'Acesso negado' }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
        <p className="text-muted-foreground">{reason}</p>
      </div>
    </div>
  );
}