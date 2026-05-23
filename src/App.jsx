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
  
  // Verificar role se requerido
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Layout
import Layout from './components/Layout';

// Components
import RoleRedirect from './components/RoleRedirect';
import TermsCheckWrapper from './components/TermsCheckWrapper';

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
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';

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
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/associates" element={<AdminAssociates />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
        <Route path="/admin/network" element={<AdminNetwork />} />
        <Route path="/admin/suppliers" element={<AdminSuppliers />} />
        <Route path="/admin/shipping" element={<AdminShipping />} />
        <Route path="/admin/external-links" element={<AdminExternalLinks />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/support-tickets" element={<AdminSupportTickets />} />
        <Route path="/admin/restricted-users" element={<AdminRestrictedUsers />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <TermsCheckWrapper>
          <Router>
            <AuthenticatedApp />
          </Router>
        </TermsCheckWrapper>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;