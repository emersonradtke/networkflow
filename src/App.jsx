import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const RequireAuth = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, user } = useAuth();
  const location = useLocation();
  
  if (isLoadingAuth || isLoadingPublicSettings) return null;
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location }} />;
  
  // Verificar role se requerido — redireciona para dashboard do usuário
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Layout
import Layout from './components/Layout';

// Components
import RoleRedirect from './components/RoleRedirect';
import TermsCheckWrapper from './components/TermsCheckWrapper.jsx';

// User Pages
import Landing from './pages/Landing';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Store from './pages/Store';
import Network from './pages/Network';
import Wallet from './pages/Wallet';
import Notifications from './pages/Notifications';
import Checkout from './pages/Checkout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAssociates from './pages/admin/AdminAssociates';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminNetwork from './pages/admin/AdminNetwork';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import AdminShipping from './pages/admin/AdminShipping';
import AdminExternalLinks from './pages/admin/AdminExternalLinks';
import AdminSupportTickets from './pages/admin/AdminSupportTickets';
import AdminRestrictedUsers from './pages/admin/AdminRestrictedUsers';
import MyOrdersPage from './pages/MyOrders';
import MyWithdrawals from './pages/MyWithdrawals';
import BankData from './pages/BankData';
import ProfileData from './pages/ProfileData';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import PublicStore from './pages/PublicStore';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando Bold Life...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For 'auth_required' we no longer auto-redirect — the Landing page handles login.
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfUse />} />
      <Route path="/loja/:invite_code" element={<PublicStore />} />
      <Route path="/PublicStore" element={<Navigate to="/" replace />} />
      
      {/* Role-based redirect */}
      <Route path="/role-redirect" element={<RoleRedirect />} />

      {/* User App (protected) */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/store" element={<Store />} />
        <Route path="/network" element={<Network />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/withdrawals" element={<MyWithdrawals />} />
        <Route path="/bank-data" element={<BankData />} />
        <Route path="/profile" element={<ProfileData />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Admin — protegido por role */}
        <Route path="/admin" element={<RequireAuth requiredRole="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/associates" element={<RequireAuth requiredRole="admin"><AdminAssociates /></RequireAuth>} />
        <Route path="/admin/products" element={<RequireAuth requiredRole="admin"><AdminProducts /></RequireAuth>} />
        <Route path="/admin/orders" element={<RequireAuth requiredRole="admin"><AdminOrders /></RequireAuth>} />
        <Route path="/admin/withdrawals" element={<RequireAuth requiredRole="admin"><AdminWithdrawals /></RequireAuth>} />
        <Route path="/admin/network" element={<RequireAuth requiredRole="admin"><AdminNetwork /></RequireAuth>} />
        <Route path="/admin/suppliers" element={<RequireAuth requiredRole="admin"><AdminSuppliers /></RequireAuth>} />
        <Route path="/admin/shipping" element={<RequireAuth requiredRole="admin"><AdminShipping /></RequireAuth>} />
        <Route path="/admin/external-links" element={<RequireAuth requiredRole="admin"><AdminExternalLinks /></RequireAuth>} />
        <Route path="/admin/settings" element={<RequireAuth requiredRole="admin"><AdminSettings /></RequireAuth>} />
        <Route path="/admin/support-tickets" element={<RequireAuth requiredRole="admin"><AdminSupportTickets /></RequireAuth>} />
        <Route path="/admin/restricted-users" element={<RequireAuth requiredRole="admin"><AdminRestrictedUsers /></RequireAuth>} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <TermsCheckWrapper>
            <AuthenticatedApp />
          </TermsCheckWrapper>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;