import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { MdDashboard, MdPeople, MdAccountBalance, MdReceiptLong, MdDownload, MdUpload, MdTrendingUp, MdSupportAgent, MdArticle, MdBarChart, MdSettings, MdLogout } from 'react-icons/md';
import PageLoader from '../../components/ui/PageLoader';
import './admin.css';

const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard', route: '/admin', icon: MdDashboard },
  { id: 'users', label: 'Users', route: '/admin/users', icon: MdPeople },
  { id: 'accounts', label: 'Accounts', route: '/admin/accounts', icon: MdAccountBalance },
  { id: 'transactions', label: 'Transactions', route: '/admin/transactions', icon: MdReceiptLong },
  { id: 'deposits', label: 'Deposits', route: '/admin/deposits', icon: MdDownload },
  { id: 'withdrawals', label: 'Withdrawals', route: '/admin/withdrawals', icon: MdUpload },
  { id: 'trades', label: 'Trades', route: '/admin/trades', icon: MdTrendingUp },
  { id: 'support', label: 'Support Tickets', route: '/admin/support', icon: MdSupportAgent },
  { id: 'content', label: 'Content', route: '/admin/content', icon: MdArticle },
  { id: 'reports', label: 'Reports', route: '/admin/reports', icon: MdBarChart },
  { id: 'settings', label: 'Settings', route: '/admin/settings', icon: MdSettings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activeRoute = adminNavItems.find((item) => location.pathname === item.route)?.id ?? 'dashboard';
  const [contentReady, setContentReady] = useState(true);

  const navigateTo = (route: string) => {
    setContentReady(false);
    navigate(route);
    if (isMobile) setMobileOpen(false);
  };

  useEffect(() => {
    if (!contentReady) {
      const timeout = window.setTimeout(() => setContentReady(true), 120);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [contentReady, location.pathname]);

  return (
    <div className={`admin-page-container page-shell${mobileOpen ? ' mobile-open' : ''}`}>
      {mobileOpen && (
        <div 
          className="admin-sidebar-overlay" 
          onClick={() => setMobileOpen(false)} 
          role="presentation"
        />
      )}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h3>Admin Panel</h3>
          <p>Platform overview</p>
        </div>

        <nav className="admin-nav">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${activeRoute === item.id ? 'active' : ''}`}
                onClick={() => navigateTo(item.route)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item logout" type="button" onClick={logout}>
            <MdLogout size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            {isMobile && (
              <button className="admin-menu-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
                {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
            )}
            <div>
              <h2>{adminNavItems.find((item) => item.id === activeRoute)?.label ?? 'Dashboard'}</h2>
              <p>Manage platform activity and user data.</p>
            </div>
          </div>
          <div className="admin-profile">
            <div className="admin-profile-avatar">{user?.fullName?.charAt(0).toUpperCase() ?? 'A'}</div>
            <div>
              <div className="admin-profile-name">{user?.fullName ?? 'Administrator'}</div>
              <div className="admin-profile-role">Admin</div>
            </div>
          </div>
        </header>

        <section className={`admin-content ${contentReady ? 'fade-in' : 'fade-out'}`}>
          <Suspense fallback={<PageLoader message="Loading admin content..." />}>
            <Outlet />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
