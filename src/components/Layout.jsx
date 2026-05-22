import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, ShoppingBag, Users, User, Wallet, Bell, Settings,
  LogOut, Menu, X, Shield, Package, BarChart3, Building2, ArrowUpCircle, Truck,
  ExternalLink, Briefcase, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAvailableMenuItems, getRoleLabel } from '@/lib/roles-config';

const LOGO_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/ece195d55_BOLDLIFE01-LOGO.png';
const ICON_URL = 'https://media.base44.com/images/public/6a0cfdbc574effcdedd29da9/fa8c43cb9_BOLDLIFE-ICON1.png';

export default function Layout() {
  const [user, setUser] = useState(null);
  const [associate, setAssociate] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { loadUser(); }, []);

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

  const iconMap = {
    LayoutDashboard, ShoppingBag, Users, User, Wallet, Bell, Settings,
    Shield, Package, BarChart3, Building2, ArrowUpCircle, Truck,
    ExternalLink, Briefcase, Eye, LogOut
  };

  const navItems = getAvailableMenuItems(user?.role || 'guest').map(item => {
    const IconComponent = iconMap[item.icon];
    return {
      ...item,
      icon: IconComponent || LayoutDashboard,
      badge: item.path === '/notifications' ? unreadCount : 0
    };
  });

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
          active
            ? 'text-white font-semibold'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        style={active ? { background: 'linear-gradient(90deg, #1B2A5E 0%, #3B9EE2 100%)' } : {}}
      >
        <Icon size={17} />
        <span className="text-sm">{item.label}</span>
        {item.badge > 0 && (
          <Badge className="ml-auto text-xs px-1.5 py-0 min-w-[20px] text-center font-bold"
            style={{ background: '#3B9EE2', color: '#fff' }}>
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center">
          <img src={LOGO_URL} alt="Bold Life" className="h-9 w-auto object-contain" />
        </div>
        {user?.role && user.role !== 'guest' && user.role !== 'associate' && (
          <div className="flex items-center gap-1 mt-2">
            <Shield size={10} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">{getRoleLabel(user.role)}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.path} item={item} />)}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1B2A5E, #3B9EE2)' }}
          >
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-sm transition-colors w-full"
          onClick={() => base44.auth.logout()}
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#EEF2F7' }}>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-56 fixed inset-y-0 left-0 z-30 bg-white shadow-sm border-r border-slate-100">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col h-full z-10 bg-white shadow-xl">
            <div className="absolute top-4 right-4">
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-700">
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
        <header className="lg:hidden sticky top-0 z-20 px-4 py-3 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-500">
              <Menu size={20} />
            </button>
            <div className="flex items-center">
              <img src={LOGO_URL} alt="Bold Life" className="h-7 w-auto object-contain" />
            </div>
          </div>
          <Link to="/notifications" className="relative">
            <Bell size={20} className="text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs text-white flex items-center justify-center font-bold"
                style={{ background: '#3B9EE2' }}>
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