import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

// Layout
import Layout from './components/Layout';

// User Pages
import Register from './pages/Register';
import AssociateLogin from './pages/AssociateLogin';
import Dashboard from './pages/Dashboard';
import Store from './pages/Store';
import Network from './pages/Network';
import Wallet from './pages/Wallet';
import Notifications from './pages/Notifications';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAssociates from './pages/admin/AdminAssociates';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminNetwork from './pages/admin/AdminNetwork';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import MyOrdersPage from './pages/MyOrders';
import MyWithdrawals from './pages/MyWithdrawals';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<AssociateLogin />} />
          <Route path="/register" element={<Register />} />

          {/* App com layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/store" element={<Store />} />
            <Route path="/network" element={<Network />} />
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/withdrawals" element={<MyWithdrawals />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/notifications" element={<Notifications />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/associates" element={<AdminAssociates />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
            <Route path="/admin/network" element={<AdminNetwork />} />
            <Route path="/admin/suppliers" element={<AdminSuppliers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;