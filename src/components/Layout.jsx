import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, ShoppingBag, Users, Wallet, Bell, Settings,
  LogOut, Menu, X, ChevronRight, Shield, Package, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const ICON_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [associate, setAssociate] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
    if (me) {
      const associates = await base44.entities.Associate.filter({ user_id: me.id });
      if (associates.length > 0) setAssociate(associates[0]);
      const notifs = await base44.entities.Notification.filter({ associate_id: me.id, is_read: false });
      setUnreadCount(notifs.length);
    }
  };

  const isAdmin = user?.role === 'admin';

  const adminNav = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/associates', label: 'Associados', icon: Users },
    { path: '/admin/products', label: 'Produtos', icon: Package },
    { path: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
    { path: '/admin/withdrawals', label: 'Saques', icon: Wallet },
    { path: '/admin/network', label: 'Rede', icon: BarChart3 },
    { path: '/admin/settings', label: 'Configurações', icon: Settings },
  ];

  const userNav = [
    { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { path: '/store', label: 'Loja', icon: ShoppingBag },
    { path: '/network', label: 'Minha Rede', icon: Users },
    { path: '/wallet', label: 'Carteira', icon: Wallet },
    { path: '/notifications', label: 'Notificações', icon: Bell, badge: unreadCount },
  ];

  const navItems = isAdmin ? adminNav : userNav;

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative ${
          active
            ? 'bg-white/20 text-white border-l-2 border-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <Icon size={17} className={active ? 'text-white' : 'text-white/70 group-hover:text-white'} />
        <span className="font-medium text-sm">{item.label}</span>
        {item.badge > 0 && (
          <Badge className="ml-auto bg-white text-[#1B2A5E] text-xs px-1.5 py-0 min-w-[20px] text-center font-bold">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/15">
        <div className="flex items-center gap-2">
          <img
            src={ICON_URL}
            alt="Bold Life Icon"
            className="h-8 w-8 object-contain flex-shrink-0"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <img
            src={LOGO_URL}
            alt="Bold Life"
            className="h-6 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 mt-2">
            <Shield size={10} className="text-white/60" />
            <span className="text-xs text-white/60 font-medium">Admin</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.path} item={item} />)}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/15">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors w-full"
          onClick={() => base44.auth.logout()}
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F4FA' }}>
      {/* Sidebar Desktop */}
      <aside
        className="hidden lg:flex flex-col w-56 fixed inset-y-0 left-0 z-30"
        style={{ background: 'linear-gradient(180deg, #1B2A5E 0%, #2563a8 60%, #3B9EE2 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative w-64 flex flex-col h-full z-10"
            style={{ background: 'linear-gradient(180deg, #1B2A5E 0%, #2563a8 60%, #3B9EE2 100%)' }}
          >
            <div className="absolute top-4 right-4">
              <button onClick={() => setSidebarOpen(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header
          className="lg:hidden sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #1B2A5E 0%, #3B9EE2 100%)' }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-white">
              <Menu size={20} />
            </button>
            <img
              src={ICON_URL}
              alt="Bold Life"
              className="h-7 w-7 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <Link to="/notifications" className="relative">
            <Bell size={20} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-xs text-[#1B2A5E] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Link>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          <Outlet context={{ user, associate, reloadUser: loadUser }} />
        </div>
      </main>
    </div>
  );
}